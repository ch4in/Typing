<template>
  <div class="login">
    <el-row>
      <el-col>
        <h1>
          Typing
          <br />打字测试平台
        </h1>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <el-select v-model="selectSchool" style="width: 250px">
          <el-option v-for="v in optionsSchool" :key="v" :value="v"></el-option>
        </el-select>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <el-select v-model="selectClass" style="width: 250px">
          <el-option v-for="v in optionsClass" :key="v" :value="v"></el-option>
        </el-select>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <el-input placeholder="请输入姓名" v-model="uname">
          <template slot="prepend">姓名</template>
        </el-input>
        <el-tag
          type="danger"
          v-show="nameLengthError"
          style="position: absolute; left: 270px; top: 4px"
          >名字长度应在2到4个字符。</el-tag
        >
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <el-button type="primary" @click="loginFn" style="width: 250px"
          >进入</el-button
        >
      </el-col>
    </el-row>
    <el-alert
      title="登录失败，请检查学校/班级/姓名是否正确。"
      type="error"
      v-show="loginError"
    >
    </el-alert>
  </div>
</template>

<script>
export default {
  name: "Login",
  data() {
    return {
      uname: "",
      selectSchool: "沙城一小",
      optionsSchool: ["沙城一小"],
      selectClass: "四（1）班",
      optionsClass: [
        "四（1）班",
        "四（2）班",
        "四（3）班",
        "四（4）班",
        "四（5）班",
        "四（6）班",
        "五（1）班",
        "五（2）班",
        "五（3）班",
        "五（4）班",
        "五（5）班",
        "五（6）班",
        "六（1）班",
        "六（2）班",
        "六（3）班",
        "六（4）班",
        "六（5）班",
        "六（6）班",
      ],
      nameLengthError: 0,
      loginError: 0,
    };
  },
  methods: {
    loginFn() {
      if (2 <= this.uname.length && this.uname.length <= 4) {
        this.nameLengthError = this.loginError = 0;
        var gn = this.classToGraduationNum(this.selectClass);
        var params = new URLSearchParams({
          school: this.selectSchool,
          stuClass: gn,
          stuName: this.uname,
        });
        // 登录验证
        var _this = this;
        axios({
          url: "/user_login/",
          method: "post",
          data: params,
          responseType: "text",
        })
          .then(function (res) {
            if (res.data) {
              _this.$store.state.user.school = _this.selectSchool;
              _this.$store.state.user.stuClass = _this.selectClass;
              _this.$store.state.user.stuName = _this.uname;
              _this.$store.state.user.stuID = res.data;
              _this.$store.commit("set_name", _this.uname);
              _this.$router.push("/typing");
            } else {
              _this.loginError = 1;
            }
          })
          .catch(function (err) {
            console.log(err);
          });
      } else {
        this.nameLengthError = 1;
      }
    },
  },
  created() {
    document.title = "登录";
  },
};
</script>

<style>
.login {
  margin: 10% auto;
  width: 250px;
}
.el-row {
  margin: 10px 0;
}
</style>
