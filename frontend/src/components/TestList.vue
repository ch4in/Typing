<template>
  <div class="testList">
    <h1>测试列表</h1>
    <el-table :data="tableData" style="width: 100%" @row-click="handleRowClick" :cell-style="{ 'text-align': 'center' }" :header-cell-style="{ 'text-align': 'center' }">
      <el-table-column prop="school" label="学校"></el-table-column>
      <el-table-column prop="class" label="班级"></el-table-column>
      <el-table-column prop="type" label="测试类型"></el-table-column>
      <el-table-column prop="time" label="测试时间（分钟）"></el-table-column>
      <el-table-column label="操作">
        <template slot-scope="scope">
          <el-button size="mini" @click="handleEnter(scope.$index, scope.row)">进入</el-button>
          <el-button size="mini" @click="handleRank(scope.$index, scope.row)">排行</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script>
export default {
  name: 'TestList',
  data () {
    return {
      tableData: []
    }
  },
  methods: {
    handleRowClick (row, column, event) {

    },
    handleEnter (index, row) {
      var _this = this
      this.$prompt('请输入测试码', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(({ value }) => {
          if (value == null) {
            throw ''
          }
          axios
            .get('/check_entryCode/', {
              params: {
                code: value,
                id: _this.tableData[index].testID
              }
            })
            .then(function (response) {
              if (response.data['res'] !== true) {
                _this.$message({
                  type: 'error',
                  message: '测试码错误'
                })
              } else {
                _this.loadArticle(index, row)
                _this.$message({
                  type: 'success',
                  message: '开始测试'
                })
              }
            })
            .catch(function (error) {})
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '请询问老师获取测试码'
          })
        })
    },
    loadArticle (index, row) {
      this.$store.state.user.school = row.school
      this.$store.state.user.stuClass = row.class
      this.$store.state.testInfo.totalTestTime = row.time
      var _this = this
      axios
        .get('/get_article/', {
          params: {
            testID: this.tableData[index].testID
          }
        })
        .then(function (response) {
          _this.$store.state.article['title'] = response.data['title']
          _this.$store.state.article['content'] = response.data['content']
          _this.$store.state.article['type'] = response.data['type']
          _this.$store.state.testInfo.testID = response.data['testID']
          _this.$router.push('article')
        })
        .catch(function (error) {
          console.log(error)
        })
    },
    handleRank (index, row) {
      this.$store.state.testInfo.testID = this.tableData[index].testID
      if (row.type == '中文') {
        this.$store.state.article.type = 'Cn'
      } else if (row.type == '英文') {
        this.$store.state.article.type = 'En'
      }
      this.$store.state.isPractice = false
      this.$router.push('rank')
    }
  },
  mounted () {
    this.$store.state.isPractice = false
    var _this = this
    axios
      .get('/get_testList/')
      .then(function (response) {
        _this.tableData = response.data
      })
      .catch(function (error) {
        console.log(error)
      })
  }
}
</script>
<style scoped>
.testList{
  margin: 50px 100px;
}
</style>
