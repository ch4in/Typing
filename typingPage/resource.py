from import_export import resources
from import_export.admin import ExportActionMixin
from typingPage.models import User, testResult
from import_export import fields, resources
from import_export.widgets import ForeignKeyWidget
from typingPage.models import SchoolClass, User, test, article, testResult, practiceResult, task, classwork

class UserResource(resources.ModelResource):
    class Meta:
        model = User
        skip_unchanged = True
        report_skipped = True
        exclude = ('uid', 'points')
        import_id_fields = ('SchoolClass', 'stuName')


class TestResultResource(resources.ModelResource):
    sClass = fields.Field(column_name='班级',attribute='testID',widget=ForeignKeyWidget(test, 'classInfo'))
    sName = fields.Field(column_name='姓名',attribute='UID',widget=ForeignKeyWidget(User, 'stuName'))
    class Meta:
        model = testResult
        skip_unchanged = True
        report_skipped = True
        import_id_fields = ('testID', 'UID.stuName', 'speed', 'correctRate', 'score')
        export_order = ('sClass', 'sName','speed', 'correctRate', 'score')
        