from django.shortcuts import render
from django.http import HttpResponse, FileResponse
from typingPage.models import SchoolClass,User, test, article, testResult, practiceResult,task,classwork
from django.utils import timezone
import json
import decimal
import os


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        super(DecimalEncoder, self).default(o)


def user_login(request):
    school = request.POST.get('school')
    stuClass = request.POST.get('stuClass')
    stuName = request.POST.get('stuName')
    schoolClass = SchoolClass.objects.filter(school=school, classNum=stuClass)
    if schoolClass:
        t = User.objects.filter(SchoolClass=schoolClass[0].id, stuName=stuName)
        if t:
            return HttpResponse(t[0].uid)
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
        pr = practiceResult.objects.filter(articleID = article.objects.select_related().get(title=request.POST['title']), 
            school=request.POST['school'],
            stuClass=request.POST['stuClass'],
            stuName=request.POST['stuName'])
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
            pr.school = request.POST['school']
            pr.stuClass = request.POST['stuClass']
            pr.stuName = request.POST['stuName']
            pr.speed = int(request.POST['speed'])
            pr.correctRate = float(request.POST['correctRate'])
            pr.score = float(request.POST['score'])
            pr.save()
        return HttpResponse("OK")


def get_rankList(request):
    rankListSet = []
    res = []
    if request.GET.get('isPractice') == 'false':
        t = test.objects.get(testID=request.GET['ID'])
        rankListSet = testResult.objects.filter(
            testID=t).order_by('-score', '-correctRate', '-speed')
        for (x, i) in enumerate(rankListSet):
            t = {}
            t['stuName'] = i.UID.stuName
            t['speed'] = i.speed
            t['correctRate'] = i.correctRate
            t['score'] = i.score
            res.append(t)
    else:
        a = article.objects.get(title=str(request.GET['ID']))
        rankListSet = practiceResult.objects.filter(
            articleID=a).order_by('-score', '-correctRate', '-speed')
        for (x, i) in enumerate(rankListSet):
            t = {}
            t['school'] = i.school
            t['stuClass'] = i.stuClass
            t['stuName'] = i.stuName
            t['speed'] = i.speed
            t['correctRate'] = i.correctRate
            t['score'] = i.score
            res.append(t)
    
    return HttpResponse(json.dumps(res, cls=DecimalEncoder), content_type="application/json")


def check_entryCode(request):
    code = request.GET['code']
    id = request.GET['ID']
    res = code == test.objects.get(testID=id).entryCode
    return HttpResponse(json.dumps({'res': res}), content_type="application/json")


def get_task(request):
    UID = User.objects.get(uid=request.GET['ID'])
    scid = UID.SchoolClass.id
    taskList = task.objects.filter(SchoolClass = scid).order_by('-id')
    res = []
    for (k,v) in enumerate(taskList):
        # 检查本地文件是否存在
        isUp = 0
        t = classwork.objects.filter(task=v.id,UID=UID)
        if t:
            if os.path.exists(t[0].filePath):
                isUp = 1
            else:
                # classwork存在，但是本地文件已被删除
                classwork.objects.filter(task=v.id,UID=UID).delete()
        res.append({
            'id':v.id,
            'taskTitle':v.taskTitle,
            'taskContent':v.taskContent,
            'isUploaded': isUp
        })
    return HttpResponse(json.dumps(res, cls=DecimalEncoder), content_type="application/json")


def upload_classwork(request):
    if request.method == "POST":
        myFile = request.FILES.get("file", None)
        if not myFile:
            return HttpResponse("NO")
        print(request.POST['isUploaded'])
        if request.POST['isUploaded'] != '0':
            os.remove(classwork.objects.filter(task=request.POST['taskID'],UID=request.POST['stuID'])[0].filePath)
        taskID = task.objects.get(id=request.POST['taskID'])
        UID = User.objects.get(uid=request.POST['stuID'])
        saveDir = taskID.rootDir + os.sep + UID.SchoolClass.school + os.sep + UID.SchoolClass.classNum + os.sep + taskID.taskTitle
        if not os.path.exists(saveDir):
            os.makedirs(saveDir)
        fname = UID.stuName + os.path.splitext(myFile.name)[1]
        filePath = os.path.join(saveDir, fname) # rootDir/学校/班级/任务名/姓名.file
        
        f = open(filePath,'wb+')
        for chunk in myFile.chunks():
            f.write(chunk)
        f.close()
        
        if request.POST['isUploaded'] != '0':
            cw = classwork.objects.filter(task=request.POST['taskID'],UID=request.POST['stuID'])[0]
            cw.filePath=filePath
            cw.save()
            return HttpResponse("OK")
        cw = classwork()
        cw.task = taskID
        cw.UID = UID 
        cw.filePath = filePath
        cw.save()
        return HttpResponse("OK")


def download_classwork(request):
    if request.method == "POST":
        fPath = classwork.objects.filter(task=request.POST['taskID'],UID=request.POST['stuID'])[0].filePath
        f = open(fPath, 'rb')
        res = FileResponse(f)
        res['Content-Type']='application/octet-stream'
        res['filename']= os.path.split(fPath)[1]
        # res['Content-Disposition']='attachment;filename="models.py"'
        return res

