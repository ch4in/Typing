import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './plugins/element.js'
import './plugins/axios'

import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'
Vue.use(mavonEditor)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

router.beforeEach((to, from, next) => {
  if (store.state.name !== '') {
    next()
  } else {
    if (to.path === '/login') {
      next()
    } else {
      next({ path: '/login' })
    }
  }
  next()
})

Vue.prototype.classToGraduationNum = function (s) {
  // 四（1）班 - 24届1班
  var date = new Date(),
    ans;
  var y = date.getUTCFullYear() - 2000;
  var m = date.getUTCMonth() + 1;
  if (m > 7) {
    if (s[0] == "三") {
      ans = (y + 4).toString();
    } else if (s[0] == "四") {
      ans = (y + 3).toString();
    } else if (s[0] == "五") {
      ans = (y + 2).toString();
    } else if (s[0] == "六") {
      ans = (y + 1).toString();
    }
  } else {
    //上半年
    if (s[0] == "三") {
      ans = (y + 3).toString();
    } else if (s[0] == "四") {
      ans = (y + 2).toString();
    } else if (s[0] == "五") {
      ans = (y + 1).toString();
    } else if (s[0] == "六") {
      ans = y.toString();
    }
  }
  return ans + "届" + s[2] + "班";
}

Vue.prototype.GraduationNumToclass = function (s) {
  // 24届1班 - 四（1）班
  var date = new Date(),
    ans = parseInt(s[0] + s[1]);
  var y = date.getUTCFullYear() - 2000;
  var m = date.getUTCMonth() + 1;
  if (m > 7) {
    if (ans - y == 4) {
      ans = "三"
    } else if (ans - y == 3) {
      ans = "四"
    } else if (ans - y == 2) {
      ans = "五"
    }else if (ans - y == 1) {
      ans = "六"
    }
  } else {
    //上半年
    if (ans - y == 3) {
      ans = "三"
    } else if (ans - y == 2) {
      ans = "四"
    } else if (ans - y == 1) {
      ans = "五"
    }else if (ans - y == 0) {
      ans = "六"
    }
  }
  return ans + "（" + s[3] + "）班";
}