import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user:{
      school: '',
      stuClass: '',
      stuName: '',
    },
    article: {
      title: '',
      content: '',
      type: ''
    },
    testInfo:{
      testID: '',
      totalTestTime: 5, //总测试时长
    },
    isPractice: false,
  },
  mutations: {
    set_name (state, n) {
      state.name = n
      localStorage.setItem('stuname', n)
    },
  },
  actions: {

  }
})
