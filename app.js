const express = require('express');
const bodyParser = require('body-parser');
const recomRoutes = require('./routes/recom');
const articleRoutes = require('./routes/article');
const { closeDb, db, initDB } = require('./config/db');
const { startExportSchedule, stopExportSchedule } = require('./utils/schedule');
const { generateHtml } =  require('./utils/generateHtml');
const { generateSitemap } =  require('./utils/generateSitemap');

const app = express();
const port = 5618;
app.use(express.static('public'));
// 中间件
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// 挂载路由
app.use('/recom', recomRoutes);
app.use('/article', articleRoutes);
// 启动服务
app.listen(port,async  () => {
  console.log(`✅ Express 服务运行在 http://localhost:${port}`);
  await initDB(db);
  await generateHtml();
  await generateSitemap();
  // 启动定时任务
  // startExportSchedule();
});

// 进程退出时优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 服务开始退出...');
  // 停止定时任务
  stopExportSchedule();
  // 关闭数据库连接
  await closeDb().catch(err => console.error('❌ 关闭数据库失败：', err.message));
  process.exit(0);
});