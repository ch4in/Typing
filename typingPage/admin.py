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
    list_display = ("UID", "articleID", 'speed',
                    'correctRate', 'score')
    fields = ("articleID", 'UID', 'speed', 'correctRate', 'score')
    search_fields = ("UID__school","UID__stuClass","UID__stuName",)
    list_filter = ("articleID",)
    list_per_page = 500
    autocomplete_fields = ["articleID","UID"]  # 带有搜索框的外键选择框


class testAdmin(admin.ModelAdmin):
    list_display = ('testID', "school", 'classInfo',
                    'articleID', 'testTotalTime', 'entryCode', 'isVisible')
    fields = ('school', 'classInfo', 'articleID',
              'testTotalTime', 'entryCode', 'isVisible')
    search_fields = ("school", 'classInfo',)
    list_filter = ("school",)


class testResultAdmin(admin.ModelAdmin):
    list_display = ("testID","学生姓名", 'speed',
                    'correctRate', 'score')
    fields = ("testID", 'UID', 'speed', 'correctRate', 'score')
    search_fields = ("testID__testID","UID__school","UID__stuClass","UID__stuName",)
    list_filter = ("testID", )
    list_per_page = 50
    autocomplete_fields = ["UID","testID"]  # 带有搜索框的外键选择框

    def 学生姓名(self,obj):
        return obj.UID.stuName


admin.site.register(models.User, UserAdmin)
admin.site.register(models.article, articleAdmin)
admin.site.register(models.practiceResult, practiceResultAdmin)
admin.site.register(models.test, testAdmin)
admin.site.register(models.testResult, testResultAdmin)