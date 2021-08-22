import Vue from 'vue'
import Router from 'vue-router'
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import Portal from './views/Portal.vue'
import Selection from './components/Selection.vue'
import TestList from './components/TestList.vue'
import ArticleList from './components/ArticleList.vue'
import Markdown from './views/Markdown.vue'
import Classwork from './views/Classwork.vue'

Vue.use(Router)

export default new Router({
  routes: [{
    path: '/portal',
    name: 'portal',
    component: Portal,
    meta: {
      title: 'Portal导航'
    }
  },
  {
    path: '/md',
    component: Markdown,
    meta: {
      title: '任务单'
    }
  }, 
  {
    path: '/classwork',
    component: Classwork,
    meta: {
      title: '课堂作业'
    }
  }, 
  {
    path: '/login',
    component: Login,
    meta: {
      title: '登录'
    }
  },
  {
    path: '/typing',
    component: Home,
    children: [{
      path: 'testList',
      name: 'testList',
      component: TestList
    },
    {
      path: 'articleList',
      name: 'articleList',
      component: ArticleList
    },
    {
      path: 'article',
      name: 'article',
      component: () => import(/* webpackChunkName: "Article" */ './components/Article.vue')
    },
    {
      path: 'rank',
      name: 'rank',
      component: () => import(/* webpackChunkName: "RankList" */ './components/RankList.vue')
    },
    {
      path: 'finger',
      name: 'finger',
      component: () => import(/* webpackChunkName: "Finger" */ './components/Finger.vue')
    },
    {
      path: 'word',
      name: 'word',
      component: () => import(/* webpackChunkName: "Word" */ './components/Word.vue')
    },
    {
      path: '',
      redirect: 'articleList'
    },
    {
      path: '*',
      redirect: 'articleList'
    }
    ]
  },
  
  {
    path: '/',
    redirect: 'portal'
  }
  ]
})
