<template>
  <div class="SubmitDialog">
    <el-dialog
      title="结 果"
      :visible.sync="visible"
      width="400px"
      @open="submit"
      @closed="handleBack"
    >
      <el-row>
        <el-col :span="12">学校：{{ this.$store.state.user.school }}</el-col>
        <el-col :span="12">班级：{{ this.$store.state.user.stuClass }}</el-col>
        <el-col :span="12">姓名：{{ this.$store.state.user.stuName }}</el-col>
        <el-col :span="12">
          速度：{{ testInfo.speed }}
          <span v-if="testInfo.type === 'Cn'">WPM</span>
          <span v-else>KPM</span>
        </el-col>
        <el-col :span="12">用时：{{ time }}</el-col>
        <el-col :span="12">正确率：{{ testInfo.correctRate }}%</el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <el-button type="primary" @click="handleBack">确 定</el-button>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>
<script>
export default {
  name: "SubmitDialog",
  props: ["visible", "testInfo"],
  data() {
    return {};
  },
  computed: {
    time() {
      var m = Math.floor(this.testInfo.time / 60);
      var s = Math.floor(this.testInfo.time) - m * 60;
      if (m <= 9) m = "0" + m;
      if (s <= 9) s = "0" + s;
      return m + "分" + s + "秒";
    },
  },
  methods: {
    // 打开dialog时直接提交成绩
    submit() {
      var params;
      if (this.$store.state.isPractice == true) {
        params = new URLSearchParams({
          title: this.$store.state.article.title,
          stuID: this.$store.state.user.stuID,
          speed: this.testInfo.speed,
          correctRate: this.testInfo.correctRate,
          score: this.testInfo.score,
        });
      } else {
        params = new URLSearchParams({
          testID: this.$store.state.testInfo.testID,
          stuID: this.$store.state.user.stuID,
          speed: this.testInfo.speed,
          correctRate: this.testInfo.correctRate,
          score: this.testInfo.score,
        });
      }

      axios({
        url: "/post_testResult/",
        method: "post",
        data: params,
        responseType: "text",
      })
        .then(function (res) {
          // console.log(res);
        })
        .catch(function (err) {
          console.log('error');
        });
    },
    handleBack(){
      if (this.$store.state.isPractice) {
            this.$router.push("articleList");
          } else {
            this.$router.push("testList");
          }
    },
  },
};
</script>
<style scoped>
</style>
