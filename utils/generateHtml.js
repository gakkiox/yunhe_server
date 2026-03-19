const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');

function getAllArticles() {
  const sql = "SELECT * FROM articles";
  return new Promise((resolve, reject) => {
    db.all(sql, (error, rows) => {
      if (error) {
        console.log("查询文章数据失败");
        reject(error);
      }
      resolve(rows);
    });
  });
}

async function processTemplateData() {
  const articles = await getAllArticles();
  const templates = [];

  articles.forEach(article => {
    const processedTags = article.tags
      ? article.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];
    const limitedTags = processedTags.slice(0, 3);

    const processedArticle = {
      ...article,
      tags: limitedTags.join(',')
    };
    const item = {
      article: processedArticle,
      recomList: []
    };
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * articles.length);
      item.recomList.push(articles[randomIndex]);
    }

    templates.push(item);
  });

  return templates;
}

/**
 * 生成文章HTML文件
 */
async function generateArticleHtml(templateData) {
  let outputPath = path.join(process.env.DIST_PATH, "/articles");
  const templatePath = path.join(process.cwd(), "/template/article.html");

  try {
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      console.log(`✅ 已创建输出目录：${outputPath}`);
    }
    const filePath = path.join(outputPath, templateData.article.slug + '.html');
    if (fs.existsSync(filePath)) {
      console.log(`⚠️ 文件已存在，跳过生成：${filePath}`);
      return;
    }
    const htmlContent = await ejs.renderFile(templatePath, templateData, {
      async: false
    });

    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`✅ HTML 文件生成成功！路径：${filePath}`);
  } catch (error) {
    console.error('❌ 生成 HTML 失败：', error.message);
    console.log(error);
  }
}
function generateDom(art) {
  return `
    <li class="animate-in slide-in-l-2/3">
      <a title="${art.title}" href="/articles/${art.slug}.html" target="_blank">${art.title}</a>
      <p>${art.summary}</p>
    </li>
  `

}
/**
 * 生成所有文章的HTML文件
 */
exports.generateHtml = async function () {
  const domsPath = path.join(process.cwd(), "/public/doms.html");
  const templates = await processTemplateData();
  let doms = '';
  for (let i = templates.length; i--;) {
    await generateArticleHtml(templates[i]);
    doms += generateDom(templates[i].article)
  }
  fs.writeFileSync(domsPath, doms);
};