<template>
  <div class="portal">
    <el-container>
      <el-header>
        <el-row>
          <img src="@/assets/portal.png" style="width: 44px" />
          <div class="loginInfo">
            <div v-if="this.$store.state.user.stuName == ''">
              <el-button
                type=""
                round
                size="medium"
                icon="el-icon-user-solid"
                @click="
                  () => {
                    this.$router.push('login');
                  }
                "
                >登录</el-button
              >
            </div>
            <div v-else>
              <span style="font-size: 14px"
                >欢迎你，{{ this.$store.state.user.school }} -
                {{ this.$store.state.user.stuClass }} -
                {{ this.$store.state.user.stuName }}</span
              >
              <el-button type="text" style="margin-left: 10px" @click="logoutFn"
                >退出</el-button
              >
            </div>
          </div>
        </el-row>
      </el-header>

      <marquee
        direction="left"
        onmouseover="this.stop()"
        onmouseout="this.start()"
      >
        <p></p>
      </marquee>

      <div v-for="(g, gi) in nav" :key="gi">
        <el-divider content-position="left">
          <h2>{{ g.title }}</h2>
        </el-divider>
        <el-row :gutter="10">
          <el-col
            v-for="(c, ci) in g.content"
            :key="ci"
            class="tabwithbutton"
            :xs="24"
            :sm="12"
            :md="6"
            :lg="4"
          >
            <a :href="c.link" :target="c.target">
              <el-card
                shadow="hover"
                class="tab"
                :body-style="{ padding: '0px', align: 'center' }"
              >
                <el-row class="tab-header">{{ c.name }}</el-row>
                <el-row class="tab-content" style="font-size: 12px">{{
                  c.info
                }}</el-row>
              </el-card>
            </a>
            <el-row class="tab-bottom">
              <el-col :span="c.tutorial && c.account ? 12 : 24">
                <el-button
                  v-if="c.tutorial"
                  type="primary"
                  plain
                  size="mini"
                  @click="handleClick('tutorial', c.path, c.tutorial)"
                  >使用教程</el-button
                >
              </el-col>
              <el-col :span="c.tutorial && c.account ? 12 : 24">
                <el-button
                  v-if="c.account"
                  type="primary"
                  plain
                  size="mini"
                  @click="handleClick('account', c.path, c.account)"
                  >账号密码</el-button
                >
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
    </el-container>
  </div>
</template>
<script>
import nav from "../assets/nav.json";
export default {
  name: "Portal",
  data() {
    return {
      nav,
    };
  },
  methods: {
    logoutFn() {
      this.$store.state.user.stuName = "";
      this.$router.push("/login");
    },
    handleClick(t, p, f) {
      if (this.$store.state.user.stuID) {
        var _this = this;
        axios({
          url: "/nav_download/",
          method: "post",
          data: new URLSearchParams({
            type: t,
            path: p,
            ext: f,
            stuID: this.$store.state.user.stuID,
          }),
          responseType: "blob",
        })
          .then(function (response) {
            // console.log(response.data);
            if (response.data.size == 2) {
              _this.$notify.error({
                title: "错误",
                message: "暂时还没有对应文件！",
              });
              return;
            } else {
              let blob = new Blob([response.data]);
              let fileNameEncode =
                response.headers["content-disposition"].split("filename=")[1];
              let fileName = decodeURIComponent(fileNameEncode); // 解码
              if (window.navigator.msSaveOrOpenBlob) {
                navigator.msSaveBlob(blob, fileName);
              } else {
                var link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = fileName.replace(new RegExp('"', "g"), "");
                link.click();
                window.URL.revokeObjectURL(link.href); //释放内存
              }
            }
          })
          .catch(function (error) {
            console.log(error);
          });
      } else {
        this.$notify.info({
          title: "提示",
          message: "请先登录！",
        });
      }
    },
  },
  created() {
    document.title = "Portal - 导航";
  },
};
</script>
<style scoped>
.portal {
  padding: 0 5%;
}

.tabwithbutton {
  min-height: 120px;
}
.tab {
  border: 1px solid #e2e2e2;
  border-radius: 2px;
  box-shadow: 0 0px 3px 0 rgba(0, 0, 0, 0.1);
}
.tab-header {
  font-size: 17px;
  font-weight: bolder;
}
a {
  text-decoration: none;
}
.loginInfo {
  text-align: right;
}
</style>
