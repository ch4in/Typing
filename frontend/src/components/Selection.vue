<template>
  <div class="selection">
    <el-row>
      <el-col
        :span="6"
        v-for="(o, index) in typingClass"
        :key="o.class"
        :offset="index > 0 ? 2 : 1"
      >
        <el-card :body-style="{ padding: '0px' }" shadow="hover">
          <img :src="o.imgurl" class="image" />
          <div style="padding: 14px;">
            <span>{{ o.class }}</span>
            <div class="bottom clearfix">
              <time class="time"></time>
              <el-button type="text" class="button">
                <router-link :to="o.tourl" style="text-decoration: none;">开始</router-link>
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'Selection',
  data () {
    return {
      typingClass: [
        {
          class: '指法',
          imgurl: require('@/assets/finger.jpeg'),
          tourl: 'finger'
        },
        {
          class: '单词',
          imgurl: require('@/assets/word.jpg'),
          tourl: 'word'
        },
        {
          class: '文章',
          imgurl: require('@/assets/articleTyping.jpg'),
          tourl: 'article'
        }
      ]
    }
  }
}
</script>

<style scoped>
.selection {
  margin-top: 5%;
  padding: auto;
}
.time {
  font-size: 13px;
  color: #999;
}

.bottom {
  margin-top: 13px;
  line-height: 12px;
}

.button {
  padding: 0;
  float: right;
}

.image {
  width: 100%;
  display: block;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both;
}
</style>
