const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const { db } = require('../config/db.js');
// 你的网站域名
const hostname = 'https://pan.useai.sbs';

// 1. 固定页面（首页、关于、列表等）
const staticPages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
];

// 2. 从数据库读取所有文章（你现在的项目最适合）
async function getArticlesFromDB() {
  return new Promise((resolve, reject) => {
    db.all('SELECT slug, create_time FROM articles', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 3. 生成 sitemap.xml
async function generateSitemap() {
  try {
    const articles = await getArticlesFromDB();

    // 拼接所有链接
    const links = [
      ...staticPages,
      ...articles.map(item => ({
        url: `/articles/${item.slug}.html`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: item.create_time,
      })),
    ];

    // 创建流
    const smStream = new SitemapStream({ hostname });
    const mapPath = path.join(process.cwd(), "/public/sitemap.xml")
    const writeStream = createWriteStream(mapPath);

    smStream.pipe(writeStream);
    links.forEach(link => smStream.write(link));
    smStream.end();

    await streamToPromise(smStream);
    console.log('✅ sitemap.xml 自动生成完成！');
  } catch (err) {
    console.error('❌ 生成失败：', err);
  }
}
module.exports = { generateSitemap }
