(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["Word"],{"2e4c":function(t,r,e){"use strict";e.r(r);var n=function(){var t=this,r=t.$createElement,e=t._self._c||r;return e("div",{staticClass:"wordWrapper"},[e("Recorder",{attrs:{speed:t.speed,unit:t.wordType,time:t.timeStr,percentage:t.percentage}}),e("div",{staticClass:"word"},t._l(t.showWord,(function(r,n){return e("span",{key:n,class:{Error:t.isError[n],Right:t.isRight[n]}},[t._v(t._s(r))])})),0),e("div",[e("el-input",{staticClass:"ipt",attrs:{maxlength:t.wordList[t.wordIndex].length},model:{value:t.wordInput,callback:function(r){t.wordInput=r},expression:"wordInput"}})],1)],1)},o=[],s=e("367c"),d=e("6d7e"),i={name:"Word",data:function(){return{wordList:["啊啊","哦","在线"],wordType:"Cn",wordIndex:0,wordInput:"",isError:[],isRight:[],speed:0,timeStr:"",percentage:0}},computed:{showWord:function(){return this.wordList[this.wordIndex]}},methods:{},watch:{wordInput:function(){this.wordList[this.wordIndex]===this.wordInput&&(this.wordIndex++,this.wordInput="")}},mounted:function(){},components:{Recorder:d["a"],Keyboard:s["a"]}},a=i,c=(e("55b5"),e("2877")),u=Object(c["a"])(a,n,o,!1,null,"332b3858",null);r["default"]=u.exports},"55b5":function(t,r,e){"use strict";var n=e("a218"),o=e.n(n);o.a},a218:function(t,r,e){}}]);
//# sourceMappingURL=Word.68ff551a.js.map