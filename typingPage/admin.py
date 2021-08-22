from django.contrib import admin
# from django.contrib.auth.models import Group, User
# admin.site.unregister(Group)
# admin.site.unregister(User)

from typingPage import models, resource
from import_export.admin import ImportExportModelAdmin

class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('school', 'classNum')
    fields = ('school', 'classNum')
    search_fields = ('school', 'classNum')


class UserAdmin(ImportExportModelAdmin):
    resource_class = resource.UserResource
    list_display = ("uid", 'SchoolClass', 'stuName', 'points')
    fields = ('SchoolClass', 'stuName', 'points')
    search_fields = ("uid", 'SchoolClass__school', 'SchoolClass__classNum','stuName')
    list_filter = ('SchoolClass__school', "SchoolClass__classNum", )


class articleAdmin(admin.ModelAdmin):
    list_display = ("title", 'content', 'type', 'isVisible')
    fields = ('title', 'content', 'type', 'isVisible')
    search_fields = ('title',)


class practiceResultAdmin(admin.ModelAdmin):
    list_display = ("school",'stuClass','stuName', "articleID", 'speed',
                    'correctRate', 'score')
    fields = ("articleID", "school",'stuClass','stuName', 'speed', 'correctRate', 'score')
    search_fields = ("school","stuClass","stuName",)
    list_filter = ("articleID",)
    list_per_page = 50
    autocomplete_fields = ["articleID"]  # 带有搜索框的外键选择框


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
    search_fields = ("testID__testID","UID__SchoolClass__school","UID__SchoolClass__classNum","UID__stuName",)
    list_filter = ("testID", )
    list_per_page = 50
    autocomplete_fields = ["UID","testID"]

    def 学生姓名(self,obj):
        return obj.UID.stuName

class taskAdmin(admin.ModelAdmin):
    list_display = ("taskTitle", 'taskContent',"班级",)
    fields = ("taskTitle", 'taskContent','rootDir',"SchoolClass",)
    search_fields = ("taskTitle", 'taskContent','rootDir')
    list_filter = ("SchoolClass", )
    list_per_page = 50

    def 班级(self, obj):
        return '，'.join([i.school+i.classNum for i in obj.SchoolClass.all()])


class classworkAdmin(admin.ModelAdmin):
    list_display = ("task", 'UID','filePath')
    fields = ("task", 'UID','filePath')
    search_fields = ("UID","task")
    list_filter = ()
    list_per_page = 50
    autocomplete_fields = ["UID","task"]
    

admin.site.register(models.SchoolClass, SchoolClassAdmin)
admin.site.register(models.User, UserAdmin)
admin.site.register(models.article, articleAdmin)
admin.site.register(models.practiceResult, practiceResultAdmin)
admin.site.register(models.test, testAdmin)
admin.site.register(models.testResult, testResultAdmin)
admin.site.register(models.task, taskAdmin)
admin.site.register(models.classwork, classworkAdmin)