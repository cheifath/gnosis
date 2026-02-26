from django.db import models

from django.contrib.auth.models import AbstractUser
from django.db import models

from django.db import models
from django.conf import settings

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=[("admin", "Admin"), ("developer", "Developer")],
        default="developer"
    )
    github_user_id = models.CharField(max_length=100, null=True, blank=True)



class Repository(models.Model):
    owner_name = models.CharField(max_length=255)
    repo_name = models.CharField(max_length=255)
    github_repo_id = models.CharField(max_length=100)
    installation_id = models.CharField(max_length=100)

    connected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # Update to use dynamic user model
        on_delete=models.CASCADE,
        related_name="repositories"
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # New field to track updates

    def __str__(self):
        return f"{self.owner_name}/{self.repo_name}"


class PullRequest(models.Model):
    repository = models.ForeignKey(
        Repository,
        on_delete=models.CASCADE,
        related_name="pull_requests"
    )

    github_pr_number = models.IntegerField()
    github_pr_id = models.CharField(max_length=100)

    title = models.CharField(max_length=500)
    author = models.CharField(max_length=255)

    state = models.CharField(max_length=50)
    commit_sha = models.CharField(max_length=100)

    processed_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("processing", "Processing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PR #{self.github_pr_number}"
    
class PullRequestFile(models.Model):
    pull_request = models.ForeignKey(
        PullRequest,
        on_delete=models.CASCADE,
        related_name="files"
    )

    filename = models.CharField(max_length=500)
    language = models.CharField(max_length=100)
    file_path = models.TextField()

    analysis_type = models.CharField(
        max_length=20,
        choices=[
            ("tool-backed", "Tool Backed"),
            ("llm-only", "LLM Only"),
        ]
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename
    
class Issue(models.Model):
    pr_file = models.ForeignKey(
        PullRequestFile,
        on_delete=models.CASCADE,
        related_name="issues"
    )

    tool = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    severity = models.CharField(max_length=50)

    line_number = models.IntegerField(null=True, blank=True)
    message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tool} - {self.severity}"
    
class Review(models.Model):
    pr_file = models.OneToOneField(
        PullRequestFile,
        on_delete=models.CASCADE,
        related_name="review"
    )

    summary_text = models.TextField()
    full_debug_text = models.TextField(null=True, blank=True)

    generated_by = models.CharField(
        max_length=20,
        choices=[
            ("tool-backed", "Tool Backed"),
            ("llm-only", "LLM Only"),
        ]
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.pr_file.filename}"
    
class Fix(models.Model):
    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="fix"
    )

    fixed_code = models.TextField()
    is_applied = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return "Fix"
    
class Confidence(models.Model):
    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="confidence"
    )

    score = models.FloatField()
    level = models.CharField(max_length=20)
    rationale = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.score}"

    
class WebhookEvent(models.Model):
    event_type = models.CharField(max_length=255)
    payload = models.JSONField()  # Store the raw payload from the GitHub webhook
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Event {self.event_type} received at {self.received_at}"
    
class AuditLog(models.Model):
    action_type = models.CharField(max_length=255)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )  # Who performed the action
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField()  # Store details of the action performed (could be a JSON object)

    def __str__(self):
        return f"{self.action_type} by {self.actor if self.actor else 'System'} at {self.timestamp}"