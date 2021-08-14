<template>
  <div class="finger">
    <Recorder></Recorder>
    <transition name="el-fade-in"><div id="char" v-show="show" >{{ char }}</div></transition>

  </div>
</template>

<script>
import Keyboard from '@/components/Keyboard'
import Recorder from '@/components/Recorder'

export default {
  name: 'Finger',
  data () {
    return {
      startFlag: 0,
      char: '',
      show: 1
    }
  },
  methods: {
    getAChar () {
      var charArray = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
      this.char = charArray[Math.floor(Math.random() * charArray.length)]
    }
  },
  created () {
    var _this = this
    this.getAChar()
    document.onkeydown = function (e) {
      var key = window.event.keyCode
      if (_this.char.charCodeAt() == key) {
        _this.show = !_this.show
        _this.getAChar()
        _this.show = !_this.show
      } else {

      }
    }
  },
  components: { Recorder, Keyboard }
}
</script>

<style scoped>
.finger{
  margin: 10px 100px;
}
#char{
    color: lightgreen;
    font-size: 300px;
    margin: 0;
}
.animated {
  animation-duration: 1s;
  animation-fill-mode: both;
}
@keyframes shake {
  from, to {
    transform: translate3d(0, 0, 0);
  }

  10%, 30%, 50%, 70%, 90% {
    transform: translate3d(-10px, 0, 0);
  }

  20%, 40%, 60%, 80% {
    transform: translate3d(10px, 0, 0);
  }
}
.shake {
  animation-name: shake;
}
</style>
