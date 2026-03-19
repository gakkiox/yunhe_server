const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'db/data.db');
console.log(dbPath)
// 创建/连接数据库
const db = new sqlite3.Database(dbPath, (err) =>  {
  if (err) {
    console.error('❌ 数据库连接失败：', err.message);
  } else {
    console.log('✅ 成功连接 SQLite 数据库');
  }
});
// 初始化推荐表
function initRecomTable(db) {
  // 返回一个 Promise 对象
  return new Promise((resolve, reject) => {
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
        const errorMsg = '❌ 创建表失败：' + err.message;
        console.error(errorMsg);
        // 失败时 reject 错误信息
        reject(new Error(errorMsg));
      } else {
        const successMsg = '✅ recommendation 表初始化完成';
        console.log(successMsg);
        // 成功时 resolve 成功信息
        resolve(successMsg);
      }
    });
  });
}

// 初始化/更新文章表（兼容新增字段）
function initArticleTable(db) {
  // 返回一个 Promise 对象
  return new Promise((resolve, reject) => {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        slug TEXT NOT NULL,
        create_time TEXT DEFAULT (date('now')), 
        cover_image TEXT DEFAULT '', 
        view_count INTEGER DEFAULT 0,
        author TEXT DEFAULT '',
        like_count INTEGER DEFAULT 0,
        author_motto TEXT DEFAULT '',
        read_time INTEGER DEFAULT 0
      );
    `;

    db.run(createTableSql, (err) => {
      if (err) {
        const errorMsg = '创建/更新文章表失败:' + err.message;
        console.error(errorMsg);
        // 失败时 reject 错误信息
        reject(new Error(errorMsg));
      } else {
        const successMsg = '✅ articles 表初始化成功';
        console.log(successMsg);
        // 成功时 resolve 成功信息
        resolve(successMsg);
      }
    });
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
async function initDB(db){
  await initRecomTable(db);
  await initArticleTable(db);
}

module.exports = { db, closeDb, dbPath, initDB };