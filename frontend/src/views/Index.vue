<template>
  <div class="index">
    <el-container>
      <el-header>
        <h1>Portal导航</h1>
      </el-header>

      <marquee direction="left" onmouseover="this.stop()" onmouseout="this.start()">
        <p>Stay Hungry, Stay Foolish.</p>
      </marquee>

      <div v-for="g in nav" :key="g">
        <el-divider content-position="left">
          <h2>{{g.title}}</h2>
        </el-divider>
        <el-row :gutter="12">
          <el-col v-for="c in g.content" :key="c" :span="6">
            <a :href="c.link" target="_blank">
              <el-card shadow="hover" class="tab">
                <el-row class="tab-header">{{c.name}}</el-row>
                <el-row class="tab-content">{{c.info}}</el-row>
              </el-card>
            </a>
            <el-row class="tab-bottom">
              <el-col :span="c.tutorial && c.account ? 12 : 24">
                <a v-if="c.tutorial" :href="c.tutorial">
                  <el-button type="primary" plain>使用教程</el-button>
                </a>
              </el-col>
              <el-col :span="c.tutorial && c.account ? 12 : 24">
                <a v-if="c.account" :href="c.account">
                  <el-button type="primary" plain>账号密码</el-button>
                </a>
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
  name: "Index",
  data() {
    return {
      nav,
      url: "http://yuntu.wzer.net/images/logo.jpg"
    };
  },
  created() {
    document.title = 'Portal导航'
  },
};
</script>
<style scoped>
.index {
  padding: 0 6%;
}
.tab {
  margin-top: 10px;
  margin-bottom: 10px;
}
.tab-header {
  font-size: 18px;
  font-weight: bolder;
}
.tab-content {
}
.tab-bottom {
}
a {
  text-decoration: none;
}
</style>