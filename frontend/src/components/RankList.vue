<template>
  <div class="rankList">
    <h1>
      排名<span v-if="this.$store.state.isPractice"> - {{ this.$store.state.article.title }}</span>
    </h1>
    <el-table
      :data="tableData"
      style="width: 100%"
      :cell-style="{ 'text-align': 'center' }"
      :header-cell-style="{ 'text-align': 'center' }"
    >
      <el-table-column type="index" label="名次">
        <template slot-scope="scope">
          <span v-if="scope.$index === 0" style=""
            ><img alt="Typing" src="@/assets/gold.png"
          /></span>
          <span v-else-if="scope.$index === 1" style=""
            ><img alt="Typing" src="@/assets/silver.png"
          /></span>
          <span v-else-if="scope.$index === 2" style=""
            ><img alt="Typing" src="@/assets/bronze.png"
          /></span>
          <span v-else>{{ scope.$index + 1 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="school" label="学校" v-if="this.$store.state.isPractice"></el-table-column>
      <el-table-column prop="stuClass" label="班级" v-if="this.$store.state.isPractice"></el-table-column>
      <el-table-column prop="stuName" label="姓名"></el-table-column>
      <el-table-column prop="correctRate" label="正确率%"></el-table-column>
      <el-table-column prop="speed" :label="labelSpeed"></el-table-column>
      <el-table-column prop="score" label="得分"></el-table-column>
    </el-table>
    <el-button class="btnBack" @click="handleBack">返回</el-button>
  </div>
</template>
<script>
export default {
  name: "RankList",
  data() {
    return {
      tableData: [],
    };
  },
  mounted() {
    var _this = this;
    var id;
    if (this.$store.state.isPractice) {
      id = this.$store.state.article.title;
    } else {
      id = this.$store.state.testInfo.testID;
    }
    axios
      .get("/get_rankList/", {
        params: {
          isPractice: this.$store.state.isPractice,
          ID: id,
        },
      })
      .then(function (response) {
        console.log()
        for(var i=0;i<response.data.length;i++){
          response.data[i].stuClass = _this.GraduationNumToclass(response.data[i].stuClass)
        }
        _this.tableData = response.data;
        
      })
      .catch(function (error) {
        console.log(error);
      });
  },
  computed: {
    labelSpeed() {
      return this.$store.state.article["type"] == "Cn"
        ? "速度WPM（字/分）"
        : "速度KPM（键/分）";
    },
  },
  methods: {
    handleBack() {
      this.$router.go(-1);
    },
  },
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
