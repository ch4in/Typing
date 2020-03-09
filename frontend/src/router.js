import Vue from 'vue'
import Router from 'vue-router'
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import Index from './views/Index.vue'
import Selection from './components/Selection.vue'
import Test from './components/Test.vue'
import Markdown from './views/Markdown.vue'

Vue.use(Router)

export default new Router({
  routes: [{
      path: '/portal',
      component: Index,
      meta: {
        title: 'Portal导航'
        }
    },
    {
      path: '/md',
      component: Markdown,
      meta: {
        title: 'Portal导航'
        }
    },
    {
      path: '/typing',
      component: Home,
      children: [{
          path: '',
          name: 'test',
          component: Test
        },
        {
          path: 'finger',
          name: 'finger',
          component: () => import( /* webpackChunkName: "Finger" */ './components/Finger.vue')
        },
        {
          path: 'word',
          name: 'word',
          component: () => import( /* webpackChunkName: "Word" */ './components/Word.vue')
        },
        {
          path: 'articleList',
          name: 'articleList',
          component: () => import( /* webpackChunkName: "ArticleList" */ './components/ArticleList.vue')
        },
        {
          path: 'article',
          name: 'article',
          component: () => import( /* webpackChunkName: "Article" */ './components/Article.vue')
        },
        {
          path: 'test',
          name: 'test',
          component: () => import( /* webpackChunkName: "Test" */ './components/Test.vue')
        },
        {
          path: 'rank',
          name: 'rank',
          component: () => import( /* webpackChunkName: "RankList" */ './components/RankList.vue')
        },
        {
          path: '*',
          component: Test
        }
      ]
    },
    {
      path: '*',
      component: Home
    }
  ]
})
