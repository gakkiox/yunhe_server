const express = require('express');
const bodyParser = require('body-parser');
const recomRoutes = require('./routes/recom');
const { closeDb } = require('./config/db');
const { startExportSchedule, stopExportSchedule } = require('./utils/schedule');

const app = express();
const port = 3000;
app.use(express.static('public'));
// 中间件
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// 挂载路由
app.use('/recom', recomRoutes);

// 启动服务
app.listen(port, () => {
  console.log(`✅ Express 服务运行在 http://localhost:${port}`);
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