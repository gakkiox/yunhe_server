const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'db/recom.db');
console.log(dbPath)
// 创建/连接数据库
const db = new sqlite3.Database(dbPath, (err) =>  {
  if (err) {
    console.error('❌ 数据库连接失败：', err.message);
  } else {
    console.log('✅ 成功连接 SQLite 数据库');
    // 初始化表
    initTable();
  }
});

// 初始化 recommendation 表
function initTable() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS recommendation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pan_type TEXT NOT NULL,
      link TEXT NOT NULL,
      date TEXT NOT NULL,
      s_id TEXT NOT NULL UNIQUE,
      pwd TEXT NOT NULL
    )
  `;
  db.run(createTableSql, (err) => {
    if (err) {
      console.error('❌ 创建表失败：', err.message);
    } else {
      console.log('✅ recommendation 表初始化完成');
    }
  });
}

// 关闭数据库连接（进程退出时调用）
function closeDb() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ 数据库连接已关闭');
        resolve();
      }
    });
  });
}

module.exports = { db, closeDb, dbPath };