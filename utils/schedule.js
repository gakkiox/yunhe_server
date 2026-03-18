const schedule = require('node-schedule');
const { saveDbDataToJson } = require('./jsonExport');

// 保存定时任务实例
let exportJob = null;

/**
 * 启动每10分钟导出 JSON 的定时任务
 */
function startExportSchedule() {
  // 立即执行一次
  saveDbDataToJson().catch(err => console.error('❌ 定时任务首次执行失败：', err.msg));

  // cron 表达式：每10分钟执行（0秒 每10分 任意时/日/月/周）
  const cronRule = '0 */10 * * * *';

  // 创建定时任务
  exportJob = schedule.scheduleJob(cronRule, async () => {
    console.log('⏰ 定时任务触发：开始导出数据库数据为JSON...');
    try {
      const result = await saveDbDataToJson();
      console.log(`✅ 定时任务执行成功：${result.msg}`);
    } catch (err) {
      console.error(`❌ 定时任务执行失败：${err.msg}`);
    }
  });

  console.log(`✅ 定时任务已启动：每10分钟（${cronRule}）自动导出JSON`);
}

/**
 * 停止定时任务
 */
function stopExportSchedule() {
  if (exportJob) {
    exportJob.cancel();
    console.log('🛑 定时任务已停止');
    exportJob = null;
  }
}

module.exports = { startExportSchedule, stopExportSchedule };