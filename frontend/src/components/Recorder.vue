<template>
  <div :class="{ fixedClass: isFixed }">
    <el-card shadow="always" class="info" :body-style="{ padding: '1px 10px' }">
      <el-row>
        <el-col :span="6">
          <el-tooltip
            v-if="unit === 'Cn'"
            effect="dark"
            content="Words Per Minute"
            placement="bottom"
          >
            <span>速度：{{ speed }} WPM(字/分)</span>
          </el-tooltip>
          <el-tooltip
            v-else
            effect="dark"
            content="Keystrokes Per Minute"
            placement="bottom"
          >
            <span>速度：{{ speed }} KPM(键/分)</span>
          </el-tooltip>
        </el-col>
        <el-col :span="6">
          <span>时间：{{ time }}</span>
        </el-col>
        <el-col :span="6" v-show="this.$store.state.isPractice">
          <el-button size="mini" @click="timePause()">{{
            this.isPause ? "开始" : "暂停"
          }}</el-button
          ><span> 还可以暂停{{ pauseTime }}次</span>
        </el-col>
        <el-col :span="this.$store.state.isPractice?6:12">
          <el-progress
            :text-inside="true"
            :stroke-width="28"
            :percentage="percentage"
          ></el-progress>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'Recorder',
  props: ['speed', 'unit', 'time', 'percentage', 'isPause', 'pauseTime'],
  data () {
    return {
      isFixed: false
    }
  },
  mounted () {
    window.addEventListener('scroll', this.handleScroll)
  },
  methods: {
    handleScroll () {
      var scrollTop =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop
      var offsetTop = document.querySelector('.info').offsetTop
      if (scrollTop > offsetTop) {
        this.isFixed = true
      } else {
        this.isFixed = false
      }
    },
    timePause () {
      this.$emit('timePause')
    }
  },
  destroyed () {
    window.removeEventListener('scroll', this.handleScroll)
  }
}
</script>

<style scoped>
.fixedClass {
  position: fixed;
  top: 0px;
  left: 0px;
  width: 100%;
  z-index: 999;
}
.info {
  text-align: left;
}
.el-col{
  line-height: 28px;
}
</style>
