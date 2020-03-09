from django.urls import path
from . import views

urlpatterns = [
    path('get_articleList/', views.get_articleList, name='get_articleList'),
    path('get_testList/', views.get_testList, name='get_testList'),
    path('get_article/', views.get_article, name='get_article'),
    path('post_testResult/', views.post_testResult, name='post_testResult'),
    path('get_rankList/', views.get_rankList, name='get_rankList'),
    path('check_entryCode/', views.check_entryCode, name='check_entryCode'),
]