<template>
  <div class="article">
    <Recorder
      :speed="speed"
      :unit="articleType"
      :time="timeStr"
      :percentage="percentage"
      :isPause="isPause"
      @timePause="timePause"
      :pauseTime="pauseTime"
    ></Recorder>
    <h1>{{ aiticleTitle }}</h1>
    <div v-for="(li, i) in lineList" :key="i">
      <div class="line">
        <span
          v-for="(l, j) in li"
          :class="[{ Error: isError[i][j] }, { Right: isRight[i][j] }]"
          :key="j"
          >{{ l }}</span
        >
      </div>
      <el-input
        ref="inputRef"
        v-model="inputList[i]"
        class="ipt"
        @focus="focus_line(i)"
        @keyup.delete.native="key_delete"
        @keyup.enter.native="key_enter"
        @paste.native.capture.prevent="false"
        :disabled="isDisabled[i]"
      ></el-input>
  <!--  -->
    </div>
    <SubmitDialog
      :visible="isDialogVisible"
      :testInfo="testInfo"
    ></SubmitDialog>
    <el-backtop target=".article"></el-backtop>
  </div>
</template>

<script>
//
import Recorder from '@/components/Recorder'
import SubmitDialog from '@/components/SubmitDialog'
export default {
  name: 'Article',
  data () {
    return {
      aiticleTitle: this.$store.state.article['title'],
      article: this.$store.state.article['content'],
      articleType: this.$store.state.article['type'],

      lineList: [''],
      inputList: [],
      isError: [[]],
      isRight: [[]],
      isDisabled: [false],
      focusedLine: 0,
      isDialogVisible: false,
      isPause: false,
      pauseTime: 3,

      time: 0,
      timeStr: '',
      percentage: 0,
      clock: '',
      correctRate: 0,
      score: 0
    }
  },
  computed: {
    totalTime () {
      return this.$store.state.testInfo.totalTestTime * 60 // 总时间（分）*60
    },
    speed () {
      return parseInt((this.typedWordNum / (this.totalTime - this.time)) * 60)
    },
    totalWordNum () {
      var t = 0
      for (var i = 0; i < this.lineList.length; i++) {
        t += this.lineList[i].length
      }
      return t
    },
    typedWordNum () {
      var t = 0
      for (var i = 0; i < this.inputList.length; i++) {
        t += this.inputList[i].length
      }
      return t
    },
    testInfo () {
      return {
        speed: this.speed,
        time: this.totalTime - this.time,
        percentage: this.percentage,
        // testInfo: this.articleType,
        correctRate: this.correctRate,
        score: this.score,
        type: this.$store.state.article['type']
      }
    }
  },
  components: { Recorder, SubmitDialog },
  created () {
    if (this.$store.state.article['title'] == '') this.$router.push('/typing')
  },
  mounted () {
    document.oncontextmenu = new Function('event.returnValue=false')
    document.onselectstart = new Function('event.returnValue=false')
    history.pushState(null, null, document.URL)
    // 使浏览器返回按钮无效，防止学生出现光标未定位到input中按了退格键，导致返回前一页
    window.addEventListener('popstate', function () {
      history.pushState(null, null, document.URL)
    })

    // 整理Article，按中英文、窗口大小切割文章，放入lineList
    if (this.articleType == 'En') {
      var wordNum = Math.floor(
        document.getElementsByClassName('article')[0].clientWidth / 12.5
      )
      var k = 0
      var paragraphList = this.article.split('\r\n')
      for (var i = 0; i < paragraphList.length; i++) {
        var wordList = paragraphList[i].trim().split(' ')
        for (var j = 0; j < wordList.length; j++) {
          if (this.lineList[k].length + wordList[j].length <= wordNum) {
            if (this.lineList[k].length == 0) {
              this.lineList[k] += wordList[j]
            } else {
              this.lineList[k] += ' ' + wordList[j]
            }
          } else {
            k++
            this.lineList.push(wordList[j])
          }
        }
        if (i != paragraphList.length - 1) {
          k++
          this.lineList.push('')
        }
      }
    } else {
      var wordNum = Math.floor(
        document.getElementsByClassName('article')[0].clientWidth / 25 - 2
      )
      var i = 0
      var k = 0
      while (i < this.article.length) {
        if (this.article[i] == '\n' && this.lineList[k].length) {
          this.lineList[k] = this.lineList[k].trim()
          this.lineList.push('')
          k++
        } else if (this.article[i] != '\n') {
          this.lineList[k] += this.article[i]
          if (this.lineList[k].length == wordNum) {
            this.lineList[k] = this.lineList[k].trim()
            this.lineList.push('')
            k++
          }
        }
        i++
      }
    }
    // 根据lineList进行初始化
    for (var i = 0; i < this.lineList.length; i++) {
      this.inputList.push('')
      this.isDisabled.push(true)
      this.isError.push([])
      this.isRight.push([])
      for (var j = 0; j < this.lineList[i].length; j++) {
        this.isError[i].push(false)
        this.isRight[i].push(false)
      }
    }

    this.$refs.inputRef[this.focusedLine].focus()
    // 开始计时
    this.countDown(true)
  },
  methods: {
    focus_line (line) {
      this.focusedLine = line
    },
    key_delete () {
      if (
        this.focusedLine - 1 >= 0 &&
        this.inputList[this.focusedLine].length == 0
      ) {
        this.$refs.inputRef[this.focusedLine - 1].focus()
      }
    },
    key_enter () {
      var i = this.focusedLine
      if (this.inputList[i] == this.lineList[i]) {
        this.$refs.inputRef[this.focusedLine + 1].focus()
      }
    },
    timePause () {
      if (this.pauseTime > 0) {
        this.isPause = !this.isPause
        if (this.isPause) {
          // 暂停
          clearInterval(this.clock)
          var i = 0
          while (i < this.isDisabled.length && this.isDisabled[i] == false) {
            this.isDisabled[i] = true
            i++
          }
        } else {
          // 开始
          this.pauseTime--
          var i = 0
          while (i < this.isDisabled.length && this.inputList[i] != '') {
            this.isDisabled[i] = false
            i++
          }
          if (
            i > 0 &&
            i < this.inputList.length &&
            this.inputList[i - 1].length == this.lineList[i - 1].length
          ) {
            this.isDisabled[i] = false
            this.focusedLine = i
          }
          this.isDisabled[0] = false
          this.countDown(false)
          this.$nextTick(() => {
            this.$refs.inputRef[this.focusedLine].focus()
          }) // 聚焦原来行
        }
      }
    },
    // 倒计时
    countDown (isFirstTime) {
      if (isFirstTime) this.time = this.totalTime
      this.clock = setInterval(() => {
        var minute = 0
        var second = 0
        if (this.time > 0) {
          minute = Math.floor(this.time / 60)
          second = Math.floor(this.time) - minute * 60
          this.time--
        } else {
          // 时间到
          this.confirmInfo(false)
        }
        if (minute <= 9) minute = '0' + minute
        if (second <= 9) second = '0' + second
        this.timeStr = minute + '分' + second + '秒'
      }, 1000)
    },
    // 确认信息
    confirmInfo (isFinished) {
      clearInterval(this.clock)
      this.$refs.inputRef[this.focusedLine].blur()
      // 忽略最后错的
      var j = this.inputList[this.focusedLine].length - 1
      j = j < this.lineList[this.focusedLine].length-1 ? j:this.lineList[this.focusedLine].length
      while(this.inputList[this.focusedLine][j] !== this.lineList[this.focusedLine][j]){
        j--
      }
      this.inputList[this.focusedLine] = this.inputList[this.focusedLine].substr(0, j+1)
      // 计算正确率
      if (isFinished === false) {
        var c = 0, t = 0
        for (var i = 0; i < this.inputList.length; i++) {
          for (j = 0; j < this.inputList[i].length; j++) {
            if (this.inputList[i][j] === this.lineList[i][j]) {
              c++
            }
            t++
          }
        }
        if (t != 0) {
          this.correctRate = Math.floor((c / t) * 1000) / 10
        } else {
          this.correctRate = 0
        }
      } else {
        this.correctRate = 100
      }
      // 计算分数，错误率<90% 分数/2
      if(this.correctRate >= 90){
        this.score = (this.correctRate * this.speed) / 100
      } else{
        this.score = (this.correctRate * this.speed) / 200
      }
      this.isDialogVisible = true
    }
  },
  watch: {
    inputList (ov, nv) {
      // 状态栏百分比显示
      var p = Math.floor((this.typedWordNum / this.totalWordNum) * 1000) / 10
      this.percentage = p <= 100 ? p : 100

      var i = this.focusedLine
      // 当前行正确、错误高亮显示
      for (var j = 0; j < this.lineList[i].length; j++) {
        if (j < nv[i].length) {
          if (nv[i][j] === this.lineList[i][j]) {
            this.isError[i][j] = false
            this.isRight[i][j] = true
          } else {
            this.isError[i][j] = true
            this.isRight[i][j] = false
          }
        } else {
          this.isError[i][j] = false
          this.isRight[i][j] = false
        }
      }
      // 完成一行
      if (nv[i].length === this.lineList[i].length) {
        // 自动换到下一行
        if (this.focusedLine + 1 !== this.lineList.length) {
          this.focusedLine++
          this.isDisabled[this.focusedLine] = false
          this.$nextTick(() => {
            this.$refs.inputRef[this.focusedLine].focus()
          })
        }
        // 判断全篇是否全部正确
        var f = true
        for (var j = 0; j < this.lineList.length; j++) {
          if (this.lineList[j] !== this.inputList[j]) {
            f = false
            break
          }
        }
        if (f) {
          this.confirmInfo(true)
        }
      }
    }
  },
  destroyed () {
    document.oncontextmenu = new Function('event.returnValue=true')
    document.onselectstart = new Function('event.returnValue=true')
  }
}
</script>

<style scoped>
.article {
  margin: 10px 100px;
}
.line {
  font-size: 25px;
  margin: 10px 16px;
  text-align: left;
}
.ipt {
  font-size: 25px;
}

.Error {
  color: white;
  background-color: #f56c6c;
}
.Right {
  color: #67c23a;
}
</style>
