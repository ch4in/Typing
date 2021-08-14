from django.contrib import admin
# from django.contrib.auth.models import Group, User
# admin.site.unregister(Group)
# admin.site.unregister(User)

from typingPage import models


# class typingInfoAdmin(admin.ModelAdmin):
#     actions = ["saveexecl"]                 # 自定义的action（导出到excel表格）
#     list_display = ("stuID", 'right', 'error', 'rate', 'typing_date')    # 显示的列
#     fields = ('stuID', 'right', 'error')
#     search_fields = ('stuID',)      # 可以搜索的字段
#     date_hierarchy = 'typing_date'      # 按照日期显示
#     list_filter = ("stuID", 'typing_date')         # 过滤条件
#     list_per_page = 50  # 每页显示500条，太多了可能会出现服务器崩掉的情况

#     TODO:数据导出为excel
#     def saveexecl(self,request,queryset):
#         Begin = xlwt.Workbook()
#         sheet = Begin.add_sheet("response")
#         cols = 0
#         for query in queryset:
#             # you need write colms                     # 好像有个方法可以一次性写入所有列，记不清了，只能用这种简单的方法去实现
#             sheet.write(cols,1,str(query.idfa))        # 写入第一列
#             sheet.write(cols,2,str(query.day_time))    # 写入第二列
#             sheet.write(cols,3,str(query.keyword))     # 写入第三列
#             cols += 1
#         Begin.save("%s" %(filename))
#         def file_iterator(filename,chuck_size=512):
#             with open(filename,"rb") as f:
#                 while True:
#                     c = f.read(chuck_size)
#                     if c:
#                         yield c
#                     else:
#                         break
#         response = StreamingHttpResponse(file_iterator(filename))
#         response['Content-Type'] = 'application/octet-stream'
#         response['Content-Disposition'] = 'attachment;filename="{}"'.format("result.xls")
#         return response
#     saveexecl.short_description = "导出Excel"            # 按钮显示名字


class articleAdmin(admin.ModelAdmin):
    list_display = ("title", 'content', 'type', 'isVisible')
    fields = ('title', 'content', 'type', 'isVisible')
    search_fields = ('title',)

class practiceResultAdmin(admin.ModelAdmin):
    list_display = ("articleID", "stuName", 'speed',
                    'correctRate', 'score')
    fields = ("articleID", 'stuName', 'speed', 'correctRate', 'score')
    search_fields = ('stuName',)
    list_filter = ("articleID", )
    list_per_page = 50


class testAdmin(admin.ModelAdmin):
    list_display = ('testID', "school", 'classInfo',
                    'articleID', 'testTotalTime','entryCode', 'isVisible')
    fields = ('school', 'classInfo', 'articleID', 'testTotalTime', 'entryCode', 'isVisible')


class testResultAdmin(admin.ModelAdmin):
    list_display = ("testID", "test_school", "test_class", "stuName", 'speed',
                    'correctRate', 'score')
    fields = ("testID", 'stuName', 'speed', 'correctRate', 'score')
    search_fields = ('stuName',)
    list_filter = ("testID", )
    list_per_page = 50

    def test_school(self, obj):
        return obj.testID.school

    def test_class(self, obj):
        return obj.testID.classInfo





admin.site.register(models.article, articleAdmin)
admin.site.register(models.practiceResult, practiceResultAdmin)
admin.site.register(models.test, testAdmin)
admin.site.register(models.testResult, testResultAdmin)

