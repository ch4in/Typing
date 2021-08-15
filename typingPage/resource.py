from import_export import resources
from typingPage.models import User

class UserResource(resources.ModelResource):

    class Meta:
        model = User
        skip_unchanged = True
        report_skipped = True
        exclude = ('uid', 'points')
        import_id_fields = ('school', 'stuClass', 'stuName')