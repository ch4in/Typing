from import_export import resources
from import_export.admin import ExportActionMixin
from typingPage.models import User, testResult

class UserResource(resources.ModelResource):
    class Meta:
        model = User
        skip_unchanged = True
        report_skipped = True
        exclude = ('uid', 'points')
        import_id_fields = ('SchoolClass', 'stuName')


class TestResultResource(resources.ModelResource):
    class Meta:
        model = testResult
        skip_unchanged = True
        report_skipped = True
        import_id_fields = ('testID', 'UID.stuName', 'speed', 'correctRate', 'score')
        