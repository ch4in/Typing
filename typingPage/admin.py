from django.contrib import admin
# from django.contrib.auth.models import Group, User
# admin.site.unregister(Group)
# admin.site.unregister(User)

from typingPage import models, resource
from import_export.admin import ImportExportModelAdmin


class UserAdmin(ImportExportModelAdmin):
    resource_class = resource.UserResource
    list_display = ("uid", 'school', 'stuClass', 'stuName', 'points')
    fields = ('school', 'stuClass', 'stuName', 'points')
    search_fields = ("uid", 'school', 'stuClass', 'stuName')
    list_filter = ('school', "stuClass", )


class articleAdmin(admin.ModelAdmin):
    list_display = ("title", 'content', 'type', 'isVisible')
    fields = ('title', 'content', 'type', 'isVisible')
    search_fields = ('title',)


class practiceResultAdmin(admin.ModelAdmin):
    list_display = ("测试学校", "测试班级","UID", "articleID", 'speed',
                    'correctRate', 'score')
    fields = ("articleID", 'UID', 'speed', 'correctRate', 'score')
    search_fields = ('UID',)
    list_filter = ("articleID", )
    list_per_page = 500

    def 测试学校(self, obj):
        return obj.UID.school

    def 测试班级(self, obj):
        return obj.UID.stuClass


class testAdmin(admin.ModelAdmin):
    list_display = ('testID', "school", 'classInfo',
                    'articleID', 'testTotalTime', 'entryCode', 'isVisible')
    fields = ('school', 'classInfo', 'articleID',
              'testTotalTime', 'entryCode', 'isVisible')


class testResultAdmin(admin.ModelAdmin):
    list_display = ("testID", "测试学校", "测试班级", "学生姓名", 'speed',
                    'correctRate', 'score')
    fields = ("testID", 'UID', 'speed', 'correctRate', 'score')
    search_fields = ("testID",'UID',)
    list_filter = ("testID", )
    list_per_page = 50

    def 测试学校(self, obj):
        return obj.testID.school

    def 测试班级(self, obj):
        return obj.testID.classInfo
    def 学生姓名(self,obj):
        return obj.UID.stuName


admin.site.register(models.User, UserAdmin)
admin.site.register(models.article, articleAdmin)
admin.site.register(models.practiceResult, practiceResultAdmin)
admin.site.register(models.test, testAdmin)
admin.site.register(models.testResult, testResultAdmin)