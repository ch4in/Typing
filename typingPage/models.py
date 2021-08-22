from django.db import models
import datetime
from django.utils import timezone

class SchoolClass(models.Model):
    id = models.AutoField('编号', primary_key=True)
    school = models.CharField(
        '学校', choices=[('沙城一小', '沙城一小')], default='沙城一小', max_length=10)
    classNum = models.CharField('班级', max_length=5)

    def __str__(self):
        return self.school + ' / ' + self.classNum
    
    class Meta:
        verbose_name = '01 - 学校班级'
        verbose_name_plural = verbose_name
    

class User(models.Model):
    uid = models.AutoField('用户编号', primary_key=True)
    SchoolClass = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='schoolclass_user', verbose_name='学校班级', blank=True,null=True)
    stuName = models.CharField('姓名', max_length=4)
    points = models.IntegerField('积分', default=0)

    def __str__(self):
        return self.stuName

    class Meta:
        verbose_name = '02 - 用户'
        verbose_name_plural = verbose_name


class article(models.Model):
    title = models.CharField('标题', unique=True, max_length=100)
    content = models.TextField('正文')
    type = models.CharField(
        '类型', max_length=2, choices=[('Cn', '中文'), ('En', '英文')], default='Cn')
    isVisible = models.BooleanField('是否可见', default=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = '03 - 文章'
        verbose_name_plural = verbose_name


class practiceResult(models.Model):
    articleID = models.ForeignKey(
        article, on_delete=models.CASCADE, related_name='practice_rank', verbose_name='文章')
    school = models.CharField('学校', max_length=10, default='')
    stuClass = models.CharField('班级', max_length=6, default='')
    stuName = models.CharField('姓名', max_length=5, default='')
    speed = models.IntegerField('速度', default=0)
    correctRate = models.DecimalField(
        '正确率', max_digits=4, decimal_places=1, default=0)
    score = models.DecimalField(
        '得分', max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return self.stuName

    class Meta:
        verbose_name = '04 - 练习结果'
        verbose_name_plural = verbose_name


class test(models.Model):
    testID = models.AutoField('测试编号', primary_key=True)
    school = models.CharField('学校', max_length=4)
    classInfo = models.CharField('班级', max_length=5)
    testTotalTime = models.IntegerField('测试时间（分）', default=10)
    entryCode = models.CharField('测试码', default='123', max_length=20)
    articleID = models.ForeignKey(
        article, on_delete=models.CASCADE, verbose_name='文章')
    isVisible = models.BooleanField('是否可见', default=False)

    def __str__(self):
        return str(self.testID) + self.school + ' / ' + self. classInfo + ' / ' + self.articleID.title

    class Meta:
        verbose_name = '05 - 测试'
        verbose_name_plural = verbose_name


class testResult(models.Model):
    testID = models.ForeignKey(
        test, on_delete=models.CASCADE, related_name='test_rank', verbose_name='测试编号')
    UID = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='test_uid', verbose_name='学生姓名')
    speed = models.IntegerField('速度', default=0)
    correctRate = models.DecimalField(
        '正确率', max_digits=4, decimal_places=1, default=0)
    score = models.DecimalField(
        '得分', max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = '06 - 测试结果'
        verbose_name_plural = verbose_name

# choices[数据库实存值，显示值：c.get_字段名_display()]

class task(models.Model):
    id = models.AutoField('任务编号', primary_key=True)
    SchoolClass = models.ManyToManyField(SchoolClass, blank=True)
    # bookChoices = [
    #     ('六上', '六上'),
    #     ('六下', '六下'),
    #     ('五上', '五上'),
    #     ('五下', '五下'),
    #     ('四上', '四上'),
    #     ('四下', '四下'),
    #     ('三上', '三上'),
    #     ('三下', '三下'),
    # ]
    # book = models.CharField(
    #     '册', choices=bookChoices, default='六上', max_length=2)
    # unitChoices = [
    #     ('1', '第一单元'),
    #     ('2', '第二单元'),
    #     ('3', '第三单元'),
    # ]
    # unit = models.CharField('单元', choices=unitChoices, default='1', max_length=4)
    # lesson = models.CharField('课', default='第1课', max_length=30)
    taskTitle = models.CharField('任务名称',default='', max_length=100)
    taskContent = models.CharField('任务描述',default='', max_length=100)
    rootDir = models.CharField('存储根目录', default='C:\\task', max_length=200)
    # fileLimit = models.IntegerField('限制文件数', default=1)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = '07 - 任务'
        verbose_name_plural = verbose_name


class classwork(models.Model):
    id = models.AutoField('作业编号', primary_key=True)
    task = models.ForeignKey(
        task, on_delete=models.CASCADE, related_name='classwork_task', verbose_name='任务')
    UID = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='classwork_uid', verbose_name='学生')
    filePath = models.CharField('保存路径', default='', max_length=200)

    class Meta:
        verbose_name = '08 - 课堂作业'
        verbose_name_plural = verbose_name
