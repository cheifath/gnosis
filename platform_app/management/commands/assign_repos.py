from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from platform_app.models import Repository

User = get_user_model()


class Command(BaseCommand):
    help = "Assign all unowned repositories to a specific user by email"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Email of the user to assign repos to")

    def handle(self, *args, **options):
        email = options["email"]
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"No user found with email: {email}"))
            return

        unowned = Repository.objects.filter(connected_by__isnull=True)
        count = unowned.count()

        if count == 0:
            self.stdout.write(self.style.WARNING("No unowned repositories found."))
            return

        unowned.update(connected_by=user)
        self.stdout.write(self.style.SUCCESS(
            f"Assigned {count} repositories to {user.username} ({user.email})"
        ))
