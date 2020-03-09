from django.shortcuts import render
from django.http import HttpResponse
from typingPage.models import test, article, testResult, practiceResult
from django.utils import timezone
import json
import decimal


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        super(DecimalEncoder, self).default(o)


def login(request):
    return render(request, 'typingPage/login.html')

# def submit(request):
#     r = int(request.GET['right'])
#     e = int(request.GET['error'])
#     rate = round(r / (r + e) * 100, 2)
#     t = typingInfo(stuID=request.GET['stuID'], right=request.GET['right'],
#                    error=request.GET['error'], rate=rate, typing_date=timezone.now())
#     t.save()
#     return HttpResponse('OK')

#############


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
    testSet = test.objects.all()
    res = []
    for i in testSet:
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
        tr = testResult()
        tr.testID = test.objects.select_related().get(
            testID=int(request.POST['testID']))
        tr.stuName = request.POST['stuName']
        tr.speed = int(request.POST['speed'])
        # tr.completionRate = int(request.POST['completionRate'])
        tr.correctRate = float(request.POST['correctRate'])
        tr.save()
        return HttpResponse("OK")
    else:
        pr = practiceResult()
        pr.articleID = article.objects.select_related().get(
            title=request.POST['title'])
        pr.stuName = request.POST['stuName']
        pr.speed = int(request.POST['speed'])
        pr. correctRate = float(request.POST['correctRate'])
        pr.save()
        return HttpResponse("OK")


def get_rankList(request):
    rankListSet = []
    if request.GET.get('isPractice') == 'false':
        t = test.objects.get(testID=request.GET['ID'])
        rankListSet = testResult.objects.filter(
            testID=t).order_by('-correctRate', '-speed', 'stuName')
    else:
        a = article.objects.get(title=str(request.GET['ID']))
        rankListSet = practiceResult.objects.filter(
            articleID=a).order_by('-correctRate', '-speed', 'stuName')
        pass
    res = []
    for (x, i) in enumerate(rankListSet):
        t = {}
        t['stuName'] = i.stuName
        t['speed'] = i.speed
        t['correctRate'] = i.correctRate
        res.append(t)
    return HttpResponse(json.dumps(res, cls=DecimalEncoder), content_type="application/json")


def check_entryCode(request):
    code = request.GET['code']
    id = request.GET['id']
    res = code == test.objects.get(testID=id).entryCode
    return HttpResponse(json.dumps({'res': res}), content_type="application/json")
