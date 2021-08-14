<template>
  <div class="articleList">
    <h1>练习文章</h1>
    <el-table :data="tableData" style="width: 100%">
      <el-table-column prop="title" label="标题"></el-table-column>
      <el-table-column
        prop="type"
        label="类型"
      ></el-table-column>
      <el-table-column label="操作">
        <template slot-scope="scope">
          <el-button size="mini" @click="loadArticle(scope.$index, scope.row)">练习</el-button>
          <el-button size="mini" @click="handleRank(scope.$index, scope.row)">排行</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="paginationClass">
      <el-pagination
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="handleCurrentChange"
      ></el-pagination>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      tableData: [],
      allData: [],
      total: 0,
      currentPage: 1,
      pageSize: 10
    }
  },
  mounted () {
    this.$store.state.isPractice = true
    this.currentPage = 1
    var _this = this
    axios
      .get('/get_articleList/')
      .then(function (response) {
        _this.allData = response.data
        _this.total = _this.allData.length
        _this.handleCurrentChange(1)
      })
      .catch(function (error) {
        console.log(error)
      })
  },
  methods: {
    // handleSizeChange: function(pageSize) {
    //   // 每页条数切换
    //   this.pageSize = pageSize;
    //   this.handleCurrentChange(this.currentPage1);
    // },
    handleCurrentChange (currentPage) {
      // 页码切换
      this.currentPage = currentPage
      this.currentChangePage(this.allData, currentPage)
    },
    // 分页方法（重点）
    currentChangePage (list, currentPage) {
      let from = (currentPage - 1) * this.pageSize
      let to = currentPage * this.pageSize
      this.tableData = []
      for (; from < to; from++) {
        if (list[from]) {
          this.tableData.push(list[from])
        }
      }
    },
    loadArticle (index, row) {
      this.$store.state.totalTestTime = 8 // TODO：可自定义练习时长？

      var _this = this
      axios
        .get('/get_article/', {
          params: {
            title: _this.tableData[index].title
          }
        })
        .then(function (response) {
          _this.$store.state.article['title'] = _this.tableData[index].title
          _this.$store.state.article['content'] = response.data['content']
          _this.$store.state.article['type'] = response.data['type']
          _this.$router.push('article')
        })
        .catch(function (error) {
          console.log(error)
        })
    },
    handleRank (index, row) {
      this.$store.state.article.title = this.tableData[index].title
      this.$store.state.isPractice = true
      if (row.type == '中文') {
        this.$store.state.article.type = 'Cn'
      } else if (row.type == '英文') {
        this.$store.state.article.type = 'En'
      }
      this.$router.push('rank')
    },
    filterTag (value, row) {
      return row.type === value
    }
  }
}
</script>

<style scoped>
.articleList {
  margin: 50px 100px;
}
</style>
