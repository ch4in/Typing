// 验证家校通讯录链路：dept/list(第一层级) -> 递归班级 -> user/list 拿学生
const { callApi, fetchClasses, fetchStudentsInClass } = require('./dingtalk');

(async () => {
  try {
    console.log('=== DEPT LIST 第一层级 (raw) ===');
    const r1 = await callApi('/topapi/edu/dept/list', { page_no: 1, page_size: 30 });
    console.log(JSON.stringify(r1).slice(0, 2500));

    console.log('\n=== fetchClasses() ===');
    const classes = await fetchClasses();
    console.log(JSON.stringify(classes).slice(0, 2000));

    if (classes.length) {
      console.log('\n=== fetchStudentsInClass(' + classes[0].classId + ') ===');
      console.log(JSON.stringify(await fetchStudentsInClass(classes[0].classId)).slice(0, 2000));
    }
  } catch (e) {
    console.error('[ERR]', e.message);
  }
})();
