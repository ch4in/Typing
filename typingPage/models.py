from django.db import models
import datetime
from django.utils import timezone


class User(models.Model):
    uid = models.AutoField('用户编号', primary_key=True)
    school = models.CharField('学校', max_length=20)
    stuClass = models.CharField('班级', max_length=10)
    stuName = models.CharField('姓名', max_length=4)
    points = models.IntegerField('积分', default=0)

    def __str__(self):
        return self.stuName

    class Meta:
        verbose_name = '01 - 用户'
        verbose_name_plural = verbose_name


class article(models.Model):
    title = models.CharField('标题', unique=True, max_length=100)
    content = models.TextField('正文')
    TYPE_CHOICES = [('Cn', '中文'), ('En', '英文')]
    type = models.CharField(
        '类型', max_length=2, choices=TYPE_CHOICES, default='Cn')
    isVisible = models.BooleanField('是否可见', default=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = '02 - 文章'
        verbose_name_plural = verbose_name


class test(models.Model):
    testID = models.AutoField('测试编号', primary_key=True)
    school = models.CharField('学校', max_length=4)
    classInfo = models.CharField('班级', max_length=5)
    testTotalTime = models.IntegerField('测试时间（分）', default=20)
    entryCode = models.CharField('测试码', default='123', max_length=20)
    articleID = models.ForeignKey(
        article, on_delete=models.CASCADE, verbose_name='文章')
    isVisible = models.BooleanField('是否可见', default=False)

    def __str__(self):
        return str(self.testID)

    class Meta:
        verbose_name = '04 - 测试'
        verbose_name_plural = verbose_name


class testResult(models.Model):
    testID = models.ForeignKey(
        test, on_delete=models.CASCADE, related_name='test_rank', verbose_name='测试编号')
    stuName = models.CharField('姓名', max_length=4)
    speed = models.IntegerField('速度', default=0)
    correctRate = models.DecimalField(
        '正确率', max_digits=4, decimal_places=1, default=0)
    score = models.DecimalField(
        '得分', max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = '05 - 测试结果'
        verbose_name_plural = verbose_name


class practiceResult(models.Model):
    articleID = models.ForeignKey(
        article, on_delete=models.CASCADE, related_name='practice_rank', verbose_name='文章')
    stuName = models.CharField('姓名', max_length=4)
    speed = models.IntegerField('速度', default=0)
    correctRate = models.DecimalField(
        '正确率', max_digits=4, decimal_places=1, default=0)
    score = models.DecimalField(
        '得分', max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return self.stuName

    class Meta:
        verbose_name = '03 - 练习结果'
        verbose_name_plural = verbose_name
