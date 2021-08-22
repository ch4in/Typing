<template>
  <div>
    <el-container>
      <el-header style="margin: 20px 0">
        <el-page-header
          @back="() => this.$router.go(-1)"
          content="课堂任务提交"
        ></el-page-header>
        <el-divider></el-divider>
      </el-header>
      <el-main style="width: 95%; margin: auto">
        <el-row>
          <el-col :span="12">
            <el-row>
              <h3 style="margin-bottom: 0px">第一步：选择要提交的任务</h3>
            </el-row>
            <el-row>
              <el-table
                ref="taskTable"
                :data="tableData"
                border
                style="width: 100%"
                :header-cell-style="{ 'text-align': 'center' }"
                highlight-current-row
                @current-change="handleCurrentChange"
              >
                <el-table-column prop="taskTitle" label="任务名称" width="170">
                </el-table-column>
                <el-table-column prop="taskContent" label="任务描述">
                </el-table-column>
                <!-- <el-table-column prop="1" label="要求文件数" width="91"> </el-table-column> -->
                <el-table-column
                  prop="isUploaded"
                  label="是否已提交"
                  width="108"
                >
                  <template slot-scope="scope">
                    <i
                      :class="
                        scope.row.isUploaded ? 'el-icon-check' : 'el-icon-close'
                      "
                    ></i>
                    <span v-if="scope.row.isUploaded">
                      <el-divider direction="vertical"></el-divider>
                      <el-button
                        size="mini"
                        @click="handleDownload(scope.$index, scope.row)"
                        >下载</el-button
                      >
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </el-row>
          </el-col>
          <el-col :span="12">
            <el-row>
              <h3 style="margin-bottom: 0px">第二步：上传文件</h3>
            </el-row>
            <el-row>
              <el-upload
                :show-file-list="false"
                drag
                action="/upload_classwork/"
                :data="info"
                :before-upload="beforeUpload"
                :on-exceed="handleExceed"
                :on-success="handlerSuccess"
              >
                <i class="el-icon-upload"></i>
                <div class="el-upload__text">
                  将要上交的文件拖到此处，或<em>点击上传</em>
                </div>
                <div class="el-upload__tip" slot="tip">请勿上传无关文件。</div>
              </el-upload>
            </el-row>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script>
export default {
  data() {
    return {
      tableData: [],
      currentRow: null,
      info: {},
    };
  },
  computed: {},
  methods: {
    handleCurrentChange(currentRow, oldCurrentRow) {
      this.currentRow = currentRow;
      this.info["taskID"] = currentRow.id;
      this.info['isUploaded'] = this.currentRow.isUploaded
    },
    handleRowClick(row) {
      // @row-click="handleRowClick"
    },
    handlerSuccess(res, file) {
      if (res == "OK") {
        this.currentRow.isUploaded = 1;
        this.info['isUploaded'] = this.currentRow.isUploaded
        this.$notify({
          title: "成功",
          message: "提交成功",
          type: "success",
        });
      } else if (res == "exist") {
        
      }
    },
    beforeUpload(file){
      if(this.currentRow.isUploaded){
        let _this = this
        return new Promise(function(resolve, reject){
          _this.$confirm('你已经上传过文件了，此操作将替换已上传的文件，是否继续？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            resolve();
          }).catch(() => {
            _this.$message({
              type: 'info',
              message: '已取消'
            });
            reject();
          });
        });
      }
    },
    handleExceed(files, fileList) {
      this.$notify.error({
        title: "错误",
        message: "只能上传1个文件",
      });
      // this.$message.warning(`当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`);
    },
    handleDownload(index, row) {
      var _this = this;
      axios({
        url: "/download_classwork/",
        method: "post",
        data: new URLSearchParams({
          stuID: this.$store.state.user.stuID,
          taskID: this.currentRow.id,
          
        }),
        responseType: "blob",
      })
        .then(function (response) {
          var link = document.createElement("a");
          var href = window.URL.createObjectURL(new Blob([response.data])); //创建下载的链接
          link.href = href;
          link.download = response.headers.filename; //下载后文件名
          document.body.appendChild(link);
          link.click(); //点击下载
          document.body.removeChild(link); //下载完成移除元素
          window.URL.revokeObjectURL(href); //释放掉blob对象
          console.log(response.headers.filename);
        })
        .catch(function (error) {
          console.log(error);
        });
    },
  },
  mounted() {
    var _this = this;
    axios
      .get("/get_task/", {
        params: {
          ID: this.$store.state.user.stuID,
        },
      })
      .then(function (response) {
        _this.tableData = response.data;
        _this.$refs.taskTable.setCurrentRow(_this.tableData[0]);
        _this.currentRow = _this.tableData[0];
        _this.info = {
          stuID: _this.$store.state.user.stuID,
          taskID: _this.tableData[0].id,
          isUploaded: _this.tableData[0].isUploaded
        };
      })
      .catch(function (error) {
        console.log(error);
      });
  },
  created() {
    document.title = "作业提交";
  },
};
</script>

<style>
.el-table .warning-row {
  background: oldlace;
}

.el-table .success-row {
  background: #f0f9eb;
}
</style>