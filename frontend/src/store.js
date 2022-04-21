import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user:{
      school: '',
      stuClass: '',
      stuName: '',
      stuID:''
    },
    article: {
      title: '',
      content: '',
      type: ''
    },
    testInfo:{
      testID: '',
      totalTestTime: 3, //练习时长、总测试时长
    },
    isPractice: false,
  },
  mutations: {
    set_name (state, n, c) {
      state.name = n
      localStorage.setItem('stuname', n)
      
    },
    set_class(state, c){
      localStorage.setItem('stuclass', c)
    }
  },
  actions: {
  }
})
