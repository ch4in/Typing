<template>
  <div class="portal">
    <el-container>
      <el-header>
        <el-row>
          <el-col :offset="10" :span="1"><img src="@/assets/portal.png" style="width:44px"></img></el-col>
          <el-col :span="1" style="font-size:38px">Portal</el-col>
        </el-row>
      </el-header>

      <marquee direction="left" onmouseover="this.stop()" onmouseout="this.start()">
        <p></p>
      </marquee>

      <div v-for="(g, gi) in nav" :key="gi">
        <el-divider content-position="left">
          <h2>{{g.title}}</h2>
        </el-divider>
        <el-row :gutter="10">
          <el-col v-for="(c,ci) in g.content" :key="ci" :span="8">
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
import nav from '../assets/nav.json'
export default {
  name: 'Portal',
  data () {
    return {
      nav
    }
  },
  created () {
    document.title = 'Portal导航'
  }
}
</script>
<style scoped>
.portal {
  padding: 0 6%;
}
el-header span{
  display:flexbox;
  height: 100px;
  width: 100px;
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
