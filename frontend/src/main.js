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