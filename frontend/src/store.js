import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    school: '',
    class: '',
    name: '',
    totalTestTime: 5,
    article:{
      'title': '',
      'content': '',
      'type': '',
    },
    testID: '',
    isPractice: false,
  },
  mutations: {

  },
  actions: {

  }
})
