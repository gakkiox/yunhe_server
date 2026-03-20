const { db } = require('../config/db.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jsonPath = path.join(process.cwd(), 'utils/data.json');
const { generateHtml } = require('../utils/generateHtml');
const { generateSitemap } = require('../utils/generateSitemap');
// 定义JSON文件路径（相对/绝对路径都可以）
function generateAuthorMotto() {
  try {
    let data = fs.readFileSync(jsonPath, 'utf8');
    data = JSON.parse(data)
    let motto = data.author_mottos[Math.floor(Math.random() * data.author_mottos.length)]
    return motto;
  } catch (err) {
    console.error('错误：', err.message);
  }
}

function calculateReadingTime(content) {
  let wordsPerMinute = 300;
  if (!content || typeof content !== 'string') {
    return 1;
  }
  const withoutHtml = content.replace(/<[^>]+>/g, '');
  const pureText = withoutHtml.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  const wordCount = pureText.length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(readingTime, 1);
}

function generateRandomAuthor() {

  try {

    let data = fs.readFileSync(jsonPath, 'utf8');
    data = JSON.parse(data)
    let author = data.author[Math.floor(Math.random() * data.author.length)]
    return author;
  } catch (err) {
    console.error('错误：', err.message);
  }
}

function getMd5TimestampMiddle7() {
  try {
    const timestamp = Date.now().toString();
    const md5Hash = crypto.createHash('md5')
      .update(timestamp, 'utf8')
      .digest('hex');
    const startIndex = Math.floor((md5Hash.length - 7) / 2);
    const middle7 = md5Hash.slice(startIndex, startIndex + 7);

    return middle7;
  } catch (err) {
    console.error('生成 MD5 中间7位失败：', err.message);
    // 异常兜底：返回固定7位（避免程序中断）
    return 'default7';
  }
}

// 新增：生成6-12位随机字符串的工具方法
function generateRandomString() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minLength = 5;
  const maxLength = 10;
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function generateRandomDate() {
  // 定义起始和结束时间戳（2020-01-01 00:00:00 至 2026-02-28 23:59:59）
  const start = new Date('2020-01-01').getTime();
  const end = new Date('2026-02-28').getTime();
  // 生成随机时间戳
  const randomTimestamp = Math.floor(Math.random() * (end - start + 1)) + start;
  // 转换为日期对象并格式化
  const randomDate = new Date(randomTimestamp);
  const year = randomDate.getFullYear();
  const month = String(randomDate.getMonth() + 1).padStart(2, '0'); // 月份从0开始，补0
  const day = String(randomDate.getDate()).padStart(2, '0'); // 补0
  return `${year}-${month}-${day}`;
}
// 工具函数：格式化数据库返回的字段名（数据库下划线格式，前端无需转换，此处仅做字段映射）
function formatArticle(article) {
  return {
    id: article.id, // 自增ID
    title: article.title,
    summary: article.summary,
    content: article.content,
    tags: article.tags,
    create_time: article.create_time, // 下划线格式
    cover_image: article.cover_image, // 下划线格式
    view_count: article.view_count, // 下划线格式
    author: article.author, // 下划线格式（字段名本身无驼峰）
    like_count: article.like_count, // 下划线格式
    slug: article.slug // 新增slug字段
  };
}

// 1. 获取文章列表（带分页、搜索）
exports.getArticleList = (req, res) => {
  const { pageNum = 1, pageSize = 10, title = '', tags = '' } = req.body;
  const offset = (pageNum - 1) * pageSize;

  // 构建搜索条件
  let whereClause = '';
  const params = [];
  if (title) {
    whereClause += ' AND title LIKE ?';
    params.push(`%${title}%`);
  }
  if (tags) {
    whereClause += ' AND tags LIKE ?';
    params.push(`%${tags}%`);
  }

  // 查询总条数
  const countSql = `SELECT COUNT(*) AS total FROM articles WHERE 1=1 ${whereClause}`;
  db.get(countSql, params, (err, countResult) => {
    if (err) {
      return res.json({ code: 500, message: '查询总数失败', data: null });
    }

    // 查询分页数据（包含新增的slug字段）
    const listSql = `
      SELECT * FROM articles 
      WHERE 1=1 ${whereClause} 
      ORDER BY create_time DESC 
      LIMIT ? OFFSET ?
    `;
    const listParams = [...params, pageSize, offset];

    db.all(listSql, listParams, (err, rows) => {
      if (err) {
        return res.json({ code: 500, message: '查询文章列表失败', data: null });
      }
      // 格式化字段（全部下划线格式）
      const formattedList = rows.map(row => formatArticle(row));
      res.json({
        code: 200,
        message: '查询成功',
        data: {
          list: formattedList,
          total: countResult.total
        }
      });
    });
  });
};

exports.addArticle = (req, res) => {
  const { title, summary, content, tags } = req.body;

  // 参数校验（仅校验前端传入的字段）
  if (!title || !summary || !content || !tags) {
    return res.json({ code: 400, message: '标题/摘要/内容/标签不能为空', data: null });
  }
  let slug = generateRandomString() + getMd5TimestampMiddle7()
  const autoFields = {
    slug,
    create_time: generateRandomDate(),
    cover_image: `https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`, // 随机封面图
    view_count: Math.floor(Math.random() * 2000),
    author: generateRandomAuthor(),
    like_count: Math.floor(Math.random() * 200),
    author_motto: generateAuthorMotto(),
    read_time: calculateReadingTime(content)
  };
  // 生成插入文章的SQL语句
  let insertSql = `
  INSERT INTO articles (
    title, summary, content, tags, slug,
    create_time, cover_image, view_count,
    author, like_count, author_motto, read_time
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(
    insertSql,
    [
      title, summary, content, tags, autoFields.slug,
      autoFields.create_time,
      autoFields.cover_image,
      autoFields.view_count,
      autoFields.author,
      autoFields.like_count,
      autoFields.author_motto,
      autoFields.read_time,
    ],
    function (err) {
      if (err) {
        return res.json({ code: 500, message: '新增文章失败', data: null });
      }
      // 返回自增的ID
      res.json({
        code: 200,
        message: '新增文章成功',
        data: { id: this.lastID } // 数据库自增ID
      });
    }
  );
};

// 3. 编辑文章（仅更新前端传入的4个核心字段，自动生成字段（含slug）不允许修改）
exports.editArticle = (req, res) => {
  const { id, title, summary, content, tags } = req.body;

  // 参数校验
  if (!id || !title || !summary || !content || !tags) {
    return res.json({ code: 400, message: 'ID/标题/摘要/内容/标签不能为空', data: null });
  }

  // 仅更新前端传入的4个字段，自动生成的字段（含slug）不修改
  const updateSql = `
    UPDATE articles 
    SET title = ?, summary = ?, content = ?, tags = ?
    WHERE id = ?
  `;
  db.run(
    updateSql,
    [title, summary, content, tags, id],
    function (err) {
      if (err) {
        return res.json({ code: 500, message: '编辑文章失败', data: null });
      }
      if (this.changes === 0) {
        return res.json({ code: 404, message: '文章不存在', data: null });
      }
      res.json({ code: 200, message: '编辑文章成功', data: null });
    }
  );
};

// 4. 删除文章（无字段变更，仅保留）
exports.deleteArticle = (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.json({ code: 400, message: '文章ID不能为空', data: null });
  }

  const deleteSql = 'DELETE FROM articles WHERE id = ?';
  db.run(deleteSql, [id], function (err) {
    if (err) {
      return res.json({ code: 500, message: '删除文章失败', data: null });
    }
    if (this.changes === 0) {
      return res.json({ code: 404, message: '文章不存在', data: null });
    }
    res.json({ code: 200, message: '删除文章成功', data: null });
  });
};

exports.render = async (req, res) => {
  await generateHtml();
  await generateSitemap();
  res.json({ code: 200, message: '操作成功', data: null });
}