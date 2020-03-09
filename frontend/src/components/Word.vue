<template>
  <div class="wordWrapper">
    <Recorder :speed="speed" :unit="wordType" :time="timeStr" :percentage="percentage"></Recorder>
    <div class="word">
      <span v-for="(w, i) in showWord" :key="i" :class="{Error:isError[i],Right:isRight[i]}">{{ w }}</span>
    </div>
    <div>
      <el-input class="ipt" v-model="wordInput" :maxlength="wordList[wordIndex].length"></el-input>
    </div>
  </div>
</template>

<script>
import Keyboard from "@/components/Keyboard";
import Recorder from "@/components/Recorder";

export default {
  name: "Word",
  data() {
    return {
      // wordList: [
      //   "pen",
      //   "pencil",
      //   "pen",
      //   "pencil",
      //   "pen",
      //   "pencil",
      //   "pen",
      //   "pencil",
      //   "pen",
      //   "pencil",
      //   "pen",
      //   "pencil"
      // ],
      wordList:['啊啊','哦','在线'],
      wordType: "Cn",
      wordIndex: 0,
      wordInput: "",
      isError: [],
      isRight: [],
      speed: 0,
      timeStr: "",
      percentage: 0,
    };
  },
  computed: {
    showWord() {
      return this.wordList[this.wordIndex];
    }
  },
  methods: {
  },
  watch: {
    wordInput() {
      // 改变颜色
      // for(var i = 0;i<this.wordInput.length;i++){
      //   if(this.wordInput[i] == this.wordList[this.wordIndex][i]){

      //   }
      // }
      
      if (this.wordList[this.wordIndex] === this.wordInput) {
        this.wordIndex++;
        this.wordInput = "";
      }
    }
  },
  mounted() {},
  components: { Recorder, Keyboard }
};
</script>

<style scoped>
.wordWrapper {
  margin: 10px 100px;
  text-align: center;
}
.word {
  margin: 10px;
  font-size: 70px;
}
.ipt {
  width: 100px;
}
</style>
