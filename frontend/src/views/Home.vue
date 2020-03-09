<template>
  <div class="home">
    <el-menu
      :default-active="activeIndex"
      class="el-menu-demo"
      mode="horizontal"
      @select="handleSelect"
      router
    >
      <el-menu-item id="logo">
        <img alt="Typing" src="../assets/logo.png" />
        <h2>Typing</h2>
      </el-menu-item>

      <el-menu-item index="test">主页</el-menu-item>
      <!-- <el-menu-item index="finger">指法练习</el-menu-item> -->
      <!-- <el-menu-item index="word">单词练习</el-menu-item> -->
      <el-menu-item index="articleList">文章练习</el-menu-item>
      

      <!-- <el-menu-item id="userinfo">欢迎你，{{ school }} {{ uname }}</el-menu-item> -->
    </el-menu>
    <div class="line"></div>
    <router-view></router-view>
  </div>
</template>

<script>

export default {
  name: "Home",
  data() {
    return {
      activeIndex: "test"
    };
  },
  methods: {
    handleSelect(key, keyPath) {
      if(key){
        this.activeIndex = key;
      }else{
        return false;
      }
    }
  },
  created() {
    document.title = 'Typing - 打字测试'
  },
  mounted(){
    this.activeIndex = this.$route.name;
  }
}
</script>

<style scoped>
#logo img {
  max-height: 45px;
}
#logo h2 {
  display: inline-block;
  margin: 0 0 0 10px;
}
#userinfo {
  float: right;
  cursor: auto;
}
</style>
