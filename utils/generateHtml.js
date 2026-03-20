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
    // 处理标签：拆分、去空格、过滤空值、限制最多3个
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

    // 核心逻辑：生成不重复的推荐列表
    const articleCount = articles.length;
    if (articleCount < 3) {
      // 场景1：文章总数<3，添加3个相同的文章（取第一个）
      const defaultArticle = articles[0] || {}; // 兜底防止空数组
      item.recomList = Array(3).fill(defaultArticle);
    } else {
      // 场景2：文章总数≥3，生成3个不重复的随机文章
      const usedIndexes = new Set(); // 记录已选的索引，避免重复
      while (usedIndexes.size < 3) {
        const randomIndex = Math.floor(Math.random() * articleCount);
        // 确保索引未被使用过
        if (!usedIndexes.has(randomIndex)) {
          usedIndexes.add(randomIndex);
          item.recomList.push(articles[randomIndex]);
        }
      }
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
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`✅ 已创建输出目录：${outputPath}`);
  }
  const filePath = path.join(outputPath, templateData.article.slug + '.html');
  await generateTemplate(filePath, templatePath, templateData)
}

async function generateTemplate(filePath, templatePath, templateData, exists = false) {
  try {

    if (fs.existsSync(filePath) && exists == false) {
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
async function generateIndexHtml(lis) {
  let indexPath = path.join(process.env.DIST_PATH, "/index.html");
  let templatePath = path.join(process.env.DIST_PATH, "idx.html");
  if (process.env.is_dev == 'yes') {
    indexPath = path.join(process.env.DIST_PATH, "/index_test.html");
    templatePath = path.join(process.cwd(), "/template/idx.html");
  }

  await generateTemplate(indexPath, templatePath, { lis }, true)
}
/**
 * 生成所有文章的HTML文件
 */
exports.generateHtml = async function () {
  const templates = await processTemplateData();
  let doms = '';
  for (let i = templates.length; i--;) {
    await generateArticleHtml(templates[i]);
    doms += generateDom(templates[i].article)
  }
  await generateIndexHtml(doms)
};