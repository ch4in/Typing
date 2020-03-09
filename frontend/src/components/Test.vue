<template>
    <div class="test">
      <TestList></TestList>
    </div>
</template>

<script>
import TestList from '@/components/TestList'
export default {
  name: 'Test',
  data(){
    return {

    }
  },
  components:{TestList}
}
</script>

<style scoped>
.test{
  margin: 50px 100px;
}
</style>

