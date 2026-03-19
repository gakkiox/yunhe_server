const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article');

// 文章列表接口
router.post('/list', articleController.getArticleList);

// 新增文章接口
router.post('/add', articleController.addArticle);

// 编辑文章接口
router.post('/edit', articleController.editArticle);

// 删除文章接口
router.post('/delete', articleController.deleteArticle);

module.exports = router;