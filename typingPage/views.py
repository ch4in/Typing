from django.shortcuts import render
from django.http import HttpResponse
from typingPage.models import User, test, article, testResult, practiceResult
from django.utils import timezone
import json
import decimal


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        super(DecimalEncoder, self).default(o)


def user_login(request):
    school = request.POST.get('school')
    stuClass = request.POST.get('stuClass')
    stuName = request.POST.get('stuName')
    t = User.objects.filter(school=school, stuClass=stuClass, stuName=stuName)
    if t:
        return HttpResponse(t[0].uid)
    else:
        return HttpResponse("")


def get_articleList(request):
    articleSet = article.objects.filter(isVisible=True)
    res = []
    for i in articleSet:
        t = {}
        t['title'] = i.title
        t['type'] = '中文' if i.type == 'Cn' else '英文'
        res.append(t)
    return HttpResponse(json.dumps(res), content_type="application/json")


def get_testList(request):
    testSet = test.objects.filter(isVisible=True)
    res = []
    for i in testSet[::-1]:
        t = {}
        t['school'] = i.school
        t['class'] = i.classInfo
        t['type'] = '中文' if i.articleID.type == 'Cn' else '英文'
        t['time'] = i.testTotalTime
        t['testID'] = i.testID
        res.append(t)
    return HttpResponse(json.dumps(res), content_type="application/json")


def get_article(request):
    d = {}
    if request.GET.get('testID'):
        q = test.objects.select_related().get(testID=request.GET['testID'])
        d = {
            "title": q.articleID.title,
            "content": q.articleID.content,
            'type': q.articleID.type,
            'testID': q.testID
        }
    else:
        q = article.objects.get(title=request.GET['title'])
        d = {
            "content": q.content,
            'type': q.type,
        }
    return HttpResponse(json.dumps(d), content_type="application/json")


def post_testResult(request):
    if request.POST.get('testID'):
        # 测试结果
        tr = testResult.objects.filter(testID=int(request.POST['testID']),UID=int(request.POST['stuID']))
        if tr:
            tr = tr[0]
            if float(request.POST['score']) > tr.score:
                tr.speed = int(request.POST['speed'])
                tr.correctRate = float(request.POST['correctRate'])
                tr.score = float(request.POST['score'])
                tr.save()
        else:
            tr = testResult()
            tr.testID = test.objects.select_related().get(
                testID=int(request.POST['testID']))
            tr.UID = User.objects.select_related().get(
                uid=int(request.POST['stuID']))
            tr.speed = int(request.POST['speed'])
            tr.correctRate = float(request.POST['correctRate'])
            tr.score = float(request.POST['score'])
            tr.save()
        return HttpResponse("OK")
    else:
        pr = practiceResult.objects.filter(articleID = article.objects.select_related().get(title=request.POST['title']), UID=int(request.POST['stuID']))
        if pr:
            # 更新
            pr = pr[0]
            if float(request.POST['score']) > pr.score:
                pr.speed = int(request.POST['speed'])
                pr.correctRate = float(request.POST['correctRate'])
                pr.score = float(request.POST['score'])
                pr.save()
        else:
            # 新增
            pr = practiceResult()
            pr.articleID = article.objects.select_related().get(
                title=request.POST['title'])
            pr.UID = User.objects.select_related().get(
                uid=int(request.POST['stuID']))
            pr.speed = int(request.POST['speed'])
            pr.correctRate = float(request.POST['correctRate'])
            pr.score = float(request.POST['score'])
            pr.save()
        return HttpResponse("OK")


def get_rankList(request):
    rankListSet = []
    if request.GET.get('isPractice') == 'false':
        t = test.objects.get(testID=request.GET['ID'])
        rankListSet = testResult.objects.filter(
            testID=t).order_by('-score', '-correctRate', '-speed')
    else:
        a = article.objects.get(title=str(request.GET['ID']))
        rankListSet = practiceResult.objects.filter(
            articleID=a).order_by('-score', '-correctRate', '-speed')
    res = []
    for (x, i) in enumerate(rankListSet):
        t = {}
        t['school'] = i.UID.school
        t['stuClass'] = i.UID.stuClass
        t['stuName'] = i.UID.stuName
        t['speed'] = i.speed
        t['correctRate'] = i.correctRate
        t['score'] = i.score
        res.append(t)
    return HttpResponse(json.dumps(res, cls=DecimalEncoder), content_type="application/json")


def check_entryCode(request):
    code = request.GET['code']
    id = request.GET['id']
    res = code == test.objects.get(testID=id).entryCode
    return HttpResponse(json.dumps({'res': res}), content_type="application/json")
