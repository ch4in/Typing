<template>
  <div class="rankList">
    <h1>Ranklist<span v-show="this.$store.state.isPractice"> - {{this.$store.state.article.title}}</span></h1>
    <el-table :data="tableData" style="width: 100%">
      <el-table-column type="index"></el-table-column>
      <el-table-column prop="stuName" label="姓名"></el-table-column>
      <el-table-column prop="correctRate" label="正确率%"></el-table-column>
      <el-table-column prop="speed" label="速度"></el-table-column>
    </el-table>
    <el-button class="btnBack" @click="handleBack">返回</el-button>
  </div>
</template>
<script>
export default {
  name: "RankList",
  data() {
    return {
      tableData: []
    };
  },
  mounted() {
    var _this = this, id;
    if (this.$store.state.isPractice) {
      id = this.$store.state.article.title;
    } else {
      id = this.$store.state.testID;
    }
    axios
      .get("/get_rankList/", {
        params: {
          isPractice: this.$store.state.isPractice,
          ID: id
        }
      })
      .then(function(response) {
        _this.tableData = response.data;
      })
      .catch(function(error) {
        console.log(error);
      });
  },
  methods: {
    handleBack() {
      this.$router.go(-1);
    }
  }
};
</script>
<style scoped>
.rankList {
  margin: 50px 100px;
}
.btnBack {
  margin-top: 20px;
}
</style>