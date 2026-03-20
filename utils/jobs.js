const schedule = require('node-schedule');
const { generateHtml } = require('./generateHtml');
const { generateSitemap } = require('./generateSitemap');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');


// 保存定时任务实例
let exportJob = null;
function saveDbDataToJson() {
  let savePath = path.join(process.env.DIST_PATH, "recom_list.js");
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM recommendation ORDER BY id DESC";
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject({ success: false, msg: `查询失败：${err.message}` });
        return;
      }

      // 剔除 id 字段
      const dataWithoutId = rows.map(row => {
        const { id, ...rest } = row;
        return rest;
      });

      // 写入 JSON 文件
      const jsonData = JSON.stringify(dataWithoutId, null, 2);
      let jd = 'window.recom_list = ' + jsonData
      fs.writeFile(savePath, jd, 'utf8', (err) => {
        if (err) {
          reject({ success: false, msg: `写入文件失败：${err.message}` });
          return;
        }

        resolve({
          success: true,
          msg: `成功保存 ${rows.length} 条数据到 ${savePath}（已排除id字段）`,
          data: dataWithoutId
        });
      });
    });
  });
}
/**
 * 启动每10分钟导出 JSON 的定时任务
 */
async function startJobs() {
  saveDbDataToJson().catch(err => console.error('❌ 定时任务首次执行失败：', err.msg));
  await generateHtml();
  await generateSitemap();
  if (process.env.is_dev == 'yes') {
    console.log("❌ 开发环境 不执行定时任务");
    return;
  }


  // cron 表达式：每10分钟执行（0秒 每10分 任意时/日/月/周）
  const cronRule = '0 */10 * * * *';

  // 创建定时任务
  exportJob = schedule.scheduleJob(cronRule, async () => {

    console.log('⏰ 定时任务触发：开始导出数据库数据为JSON...');
    try {
      await generateHtml();
      await generateSitemap();
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
function stopJobs() {
  if (exportJob) {
    exportJob.cancel();
    console.log('🛑 定时任务已停止');
    exportJob = null;
  }
}

module.exports = { startJobs, stopJobs,saveDbDataToJson };