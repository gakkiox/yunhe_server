const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');


function saveDbDataToJson() {
  let savePath = process.env.DIST_PATH;
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

module.exports = { saveDbDataToJson };