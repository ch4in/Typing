import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    school: '',
    class: '',
    name: '',
    totalTestTime: 5, //总测试时长
    article: {
      'title': '',
      'content': '',
      'type': ''
    },
    testID: '',
    isPractice: false,
    Authorization: localStorage.getItem('Authorization') ? localStorage.getItem('Authorization') : ''
  },
  mutations: {
    set_name (state, n) {
      state.name = n
      localStorage.setItem('stuname', n)
    },
    changeLogin (state, user) {
      state.Authorization = user.Authorization
      localStorage.setItem('Authorization', user.Authorization)
    }
  },
  actions: {

  }
})
