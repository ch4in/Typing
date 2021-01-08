<template>
  <div class="home">
    <el-menu :default-active="activeIndex" mode="horizontal" @select="handleSelect">
      <el-menu-item id="logo">
        <img alt="Typing" src="@/assets/logo.png" />
        <h1>Typing</h1>
      </el-menu-item>

      <el-menu-item index="articleList">练习</el-menu-item>
      <el-menu-item index="testList">测试</el-menu-item>
      <!-- <el-menu-item index="finger">指法练习</el-menu-item> -->
      <!-- <el-menu-item index="word">单词练习</el-menu-item> -->
      
      <el-menu-item id="userinfo">
        <span>欢迎你，{{ this.$store.state.school }} {{ this.$store.state.name }}</span>
        <el-button type="text" style="margin-left:10px" @click="logoutFn">退出</el-button>
      </el-menu-item>
      
    </el-menu>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: "Home",
  data() {
    return {
      activeIndex: "articleList",
    };
  },
  methods: {
    logoutFn(){
      this.$store.state.name = ''
      this.$router.push('/login')
    },
    handleSelect(key, keyPath){
      if(key == 'testList'){
        this.$router.push('/typing/testList')
      }else if(key == 'articleList'){
        this.$router.push('/typing/articleList')
      }
    }
  },
  component: {},
  created() {
    document.title = "Typing - 打字测试";
  },
  mounted() {
    
  }
};
</script>

<style scoped>
#logo img {
  max-height: 45px;
}
#logo h1 {
  display: inline-block;
  margin: 0 0 0 10px;
}
#userinfo {
  float: right;
  cursor: auto;
  height: 60px;
  border:0px;
}
</style>
