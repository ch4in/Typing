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
        <el-select v-model="select" placeholder="请选择学校" style="width:250px">
          <el-option v-for="v in options" :key="v" :value="v"></el-option>
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
          v-show="error"
          style="position:absolute;left:270px;top:4px;"
        >名字长度应在2到4个字符。</el-tag>
      </el-col>
    </el-row>
    <el-row>
      <el-col>
        <el-button type="primary" @click="loginfn" style="width:250px">进入</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import store from "@/store";
export default {
  name: "Login",
  store,
  data() {
    return {
      uname: "",
      select: "沙城一小",
      options: ["沙城一小", "XX学校"],
      error: 0
    };
  },
  methods: {
    loginfn() {
      if (this.uname.length >= 2 && this.uname.length <= 4) {
        this.error = 0;
        // 登录验证
        store.state.school = this.select;
        store.state.username = this.uname;
        this.$router.push("/home/selection");
      } else {
        this.error = 1;
      }
    }
  }
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
