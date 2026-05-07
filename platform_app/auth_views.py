import json
import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile

User = get_user_model()


@csrf_exempt
@require_POST
def signup(request):
    """Register a new user with email/password."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return JsonResponse({"error": "username, email, and password are required"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "Username already taken"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already registered"}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role="developer",
    )
    UserProfile.objects.create(user=user)

    refresh = RefreshToken.for_user(user)
    return JsonResponse({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }
    }, status=201)


@csrf_exempt
@require_POST
def login(request):
    """Authenticate user with email/password and return JWT tokens."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return JsonResponse({"error": "email and password are required"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    if not user.check_password(password):
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    if not user.is_active:
        return JsonResponse({"error": "Account is deactivated. Contact an administrator."}, status=403)

    # Ensure profile exists
    UserProfile.objects.get_or_create(user=user)

    refresh = RefreshToken.for_user(user)
    profile = user.profile

    return JsonResponse({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "github_connected": bool(profile.github_token),
            "github_login": profile.github_login,
            "avatar_url": profile.avatar_url,
        }
    })


@csrf_exempt
@require_POST
def refresh_token(request):
    """Refresh an expired access token."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    refresh = data.get("refresh")
    if not refresh:
        return JsonResponse({"error": "refresh token required"}, status=400)

    try:
        token = RefreshToken(refresh)
        return JsonResponse({
            "access": str(token.access_token),
            "refresh": str(token),
        })
    except Exception:
        return JsonResponse({"error": "Invalid or expired refresh token"}, status=401)


@require_GET
def github_oauth_url(request):
    """Return the GitHub OAuth authorization URL for user-level connection."""
    client_id = settings.GITHUB_CLIENT_ID
    if not client_id:
        return JsonResponse({"error": "GitHub OAuth not configured"}, status=500)

    mode = request.GET.get("mode", "login")
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    redirect_uri = f"{frontend_url}/login/github/callback"
    scope = "read:user user:email repo"
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={mode}"
    )
    return JsonResponse({"url": url})


@csrf_exempt
@require_POST
def github_oauth_callback(request):
    """Exchange GitHub OAuth code for access token, create/login user."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    code = data.get("code")
    if not code:
        return JsonResponse({"error": "code is required"}, status=400)

    try:
        # Exchange code for token
        token_resp = requests.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if token_resp.status_code != 200:
            return JsonResponse({"error": "Failed to exchange code with GitHub"}, status=400)

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            error = token_data.get("error_description", "Unknown error")
            print(f"[GitHub OAuth Login] Token exchange failed: {token_data}")
            return JsonResponse({"error": error}, status=400)

        # Fetch GitHub user info
        user_resp = requests.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=10,
        )

        if user_resp.status_code != 200:
            print(f"[GitHub OAuth Login] User fetch failed: status={user_resp.status_code}, body={user_resp.text}")
            return JsonResponse({"error": f"Failed to fetch GitHub user (status {user_resp.status_code})"}, status=400)

        gh_user = user_resp.json()
        gh_id = str(gh_user["id"])
        gh_login = gh_user["login"]
        avatar_url = gh_user.get("avatar_url", "")

        # Fetch primary email
        email_resp = requests.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=10,
        )
        email = ""
        if email_resp.status_code == 200:
            for e in email_resp.json():
                if e.get("primary"):
                    email = e["email"]
                    break

        # Find or create user
        user = None
        # Check if a user with this GitHub ID exists
        profile = UserProfile.objects.filter(github_id=gh_id).first()
        if profile:
            user = profile.user

        if not user and email:
            # Check if email matches existing user
            user = User.objects.filter(email=email).first()

        if not user:
            # Check if a user with matching github_login exists in profiles
            profile = UserProfile.objects.filter(github_login=gh_login).first()
            if profile:
                user = profile.user

        if not user:
            # Check if username matches (user signed up with email but same username)
            user = User.objects.filter(username=gh_login).first()

        if not user:
            # Before creating, check if there's an active user whose profile
            # has no GitHub link but whose email domain/username could match.
            # Create new user only as last resort.
            user = User.objects.create_user(
                username=gh_login,
                email=email or f"{gh_login}@github.local",
                password=None,  # No password for OAuth users
                role="developer",
            )

        # Block deactivated users
        if not user.is_active:
            return JsonResponse({"error": "Account is deactivated. Contact an administrator."}, status=403)

        # Update/create profile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.github_id = gh_id
        profile.github_login = gh_login
        profile.github_token = access_token
        profile.avatar_url = avatar_url
        profile.connected_at = timezone.now()
        profile.save()

        # Update user github_user_id
        user.github_user_id = gh_id
        user.save(update_fields=["github_user_id"])

        refresh = RefreshToken.for_user(user)
        return JsonResponse({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "github_connected": True,
                "github_login": gh_login,
                "avatar_url": avatar_url,
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def _authenticate(request):
    """Shared JWT authentication helper."""
    from rest_framework_simplejwt.authentication import JWTAuthentication
    auth = JWTAuthentication()
    try:
        result = auth.authenticate(request)
    except Exception:
        return None
    if result is None:
        return None
    return result[0]


@require_GET
def me(request):
    """Get current authenticated user info. Requires JWT."""
    user = _authenticate(request)
    if user is None:
        return JsonResponse({"error": "Authentication required"}, status=401)

    profile, _ = UserProfile.objects.get_or_create(user=user)

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "github_connected": bool(profile.github_token),
        "github_login": profile.github_login,
        "avatar_url": profile.avatar_url,
    })


@csrf_exempt
@require_POST
def update_profile(request):
    """Update current user's profile (username, email, password)."""
    user = _authenticate(request)
    if user is None:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    has_changes = False

    # Validate username
    if username:
        if username == user.username:
            return JsonResponse({"error": "New username is the same as the current one"}, status=400)
        if User.objects.filter(username=username).exclude(id=user.id).exists():
            return JsonResponse({"error": "Username already taken"}, status=400)
        user.username = username
        has_changes = True

    # Validate email
    if email:
        if email == user.email:
            return JsonResponse({"error": "New email is the same as the current one"}, status=400)
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return JsonResponse({"error": "Email already in use"}, status=400)
        user.email = email
        has_changes = True

    # Change password (requires current password)
    if new_password:
        if not current_password:
            return JsonResponse({"error": "Current password is required to set a new password"}, status=400)
        if not user.check_password(current_password):
            return JsonResponse({"error": "Current password is incorrect"}, status=400)
        if len(new_password) < 8:
            return JsonResponse({"error": "New password must be at least 8 characters"}, status=400)
        if user.check_password(new_password):
            return JsonResponse({"error": "New password must be different from the current password"}, status=400)
        user.set_password(new_password)
        has_changes = True

    if not has_changes:
        return JsonResponse({"error": "No changes to update"}, status=400)

    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "github_connected": bool(profile.github_token),
        "github_login": profile.github_login,
        "avatar_url": profile.avatar_url,
    })


@csrf_exempt
@require_POST
def github_connect_callback(request):
    """Link a GitHub account to the currently authenticated user."""
    user = _authenticate(request)
    if user is None:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    code = data.get("code")
    if not code:
        return JsonResponse({"error": "code is required"}, status=400)

    try:
        # Exchange code for token
        token_resp = requests.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if token_resp.status_code != 200:
            return JsonResponse({"error": "Failed to exchange code with GitHub"}, status=400)

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            error = token_data.get("error_description", "Unknown error")
            return JsonResponse({"error": error}, status=400)

        # Fetch GitHub user info
        user_resp = requests.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=10,
        )

        if user_resp.status_code != 200:
            return JsonResponse({"error": f"Failed to fetch GitHub user (status {user_resp.status_code})"}, status=400)

        gh_user = user_resp.json()
        gh_id = str(gh_user["id"])
        gh_login = gh_user["login"]
        avatar_url = gh_user.get("avatar_url", "")

        # Check if this GitHub account is already linked to a DIFFERENT user
        existing_profile = UserProfile.objects.filter(github_id=gh_id).exclude(user=user).first()
        if existing_profile:
            other_user = existing_profile.user
            # If the other user was auto-created via OAuth (no usable password),
            # transfer the GitHub link to the current user instead of blocking.
            if not other_user.has_usable_password():
                existing_profile.github_id = None
                existing_profile.github_login = None
                existing_profile.github_token = None
                existing_profile.avatar_url = None
                existing_profile.connected_at = None
                existing_profile.save()
                other_user.github_user_id = None
                other_user.is_active = False
                other_user.save(update_fields=["github_user_id", "is_active"])
            else:
                return JsonResponse({
                    "error": f"This GitHub account (@{gh_login}) is already linked to another user. "
                             f"Please disconnect it from that account first, or use a different GitHub account."
                }, status=409)

        # Link GitHub to the current user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.github_id = gh_id
        profile.github_login = gh_login
        profile.github_token = access_token
        profile.avatar_url = avatar_url
        profile.connected_at = timezone.now()
        profile.save()

        user.github_user_id = gh_id
        user.save(update_fields=["github_user_id"])

        return JsonResponse({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "github_connected": True,
            "github_login": gh_login,
            "avatar_url": avatar_url,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_POST
def revoke_github(request):
    """Revoke the user's GitHub connection."""
    user = _authenticate(request)
    if user is None:
        return JsonResponse({"error": "Authentication required"}, status=401)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if not profile.github_token:
        return JsonResponse({"error": "No GitHub connection to revoke"}, status=400)

    profile.github_token = None
    profile.github_login = None
    profile.github_id = None
    profile.avatar_url = None
    profile.connected_at = None
    profile.save()

    user.github_user_id = None
    user.save()

    return JsonResponse({"message": "GitHub connection revoked successfully"})
