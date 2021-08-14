<template>
  <div class="SubmitDialog">
    <el-dialog title="结果" :visible.sync="visible" width="500px" :before-close="handleClose">
      <el-row>
        <el-col :span="12">学校：{{ this.$store.state.school }}</el-col>
        <el-col :span="12">班级：{{ this.$store.state.class }}</el-col>
        <el-col :span="12">
          速度：{{ testInfo.speed }}
          <span v-if="testInfo.type==='Cn'">WPM</span>
          <span v-else>KPM</span>
        </el-col>
        <el-col :span="12">用时：{{ time }}</el-col>
        <!-- <el-col :span="12">完成率：{{ testInfo.percentage }}%</el-col> -->
        <el-col :span="12">正确率：{{ testInfo.correctRate }}%</el-col>
        <el-col></el-col>
      </el-row>

      <div slot="footer" class="dialog-footer">
        <el-row>
          <el-col :span="8" :offset="2">
            <el-input placeholder="请输入" v-model="name" :disabled="true">
              <template slot="prepend">姓名</template>
            </el-input>
            <!-- <el-tag
              type="danger"
              v-show="isNameError"
              style="position:absolute;left:205px;top:4px;"
            >长度应在2到4个字符。</el-tag>-->
          </el-col>
          <el-col :span="24" :offset="10">
            <el-button type="primary" @click="handleSubmit">确 定</el-button>
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>
<script>
export default {
  name: 'SubmitDialog',
  props: ['visible', 'testInfo'],
  data () {
    return {
      isNameError: false
    }
  },
  computed: {
    name () {
      return this.$store.state.name
    },
    time () {
      var m = Math.floor(this.testInfo.time / 60)
      var s = Math.floor(this.testInfo.time) - m * 60
      if (m <= 9) m = '0' + m
      if (s <= 9) s = '0' + s
      return m + '分' + s + '秒'
    }
  },
  methods: {
    handleSubmit () {
      if (this.name.length >= 2 && this.name.length <= 4) {
        this.isNameError = false
        // 提交验证
        var params
        if (this.$store.state.isPractice == true) {
          params = new URLSearchParams({
            title: this.$store.state.article.title,
            stuName: this.name,
            speed: this.testInfo.speed,
            correctRate: this.testInfo.correctRate,
            score: this.testInfo.score
          })
        } else {
          params = new URLSearchParams({
            testID: this.$store.state.testID,
            stuName: this.name,
            speed: this.testInfo.speed,
            correctRate: this.testInfo.correctRate,
            score: this.testInfo.score
          })
        }
        var _this = this
        axios({
          url: '/post_testResult/',
          method: 'post',
          data: params,
          responseType: 'text'
        })
          .then(function (res) {
            if (_this.$store.state.isPractice) {
              _this.$router.push('articleList')
            } else {
              _this.$router.push('testList')
            }
          })
          .catch(function (err) {
            console.log(error)
          })
      } else {
        this.isNameError = true
      }
    },
    handleClose () {
      this.$confirm('确认放弃提交？')
        .then(_ => {
          this.$router.push('articleList')
        })
        .catch(_ => {})
    }
  }
}
</script>
<style scoped>
</style>
