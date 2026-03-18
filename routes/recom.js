const express = require('express');
const router = express.Router();
const recomController = require('../controllers/recom.js');

// 新增资源
router.post('/add', recomController.addRecom);

// 查询所有资源
router.get('/list', recomController.getRecomList);

// 查询单个资源
router.get('/detail/:s_id', recomController.getRecomDetail);

// 更新资源
router.post('/update/:s_id', recomController.updateRecom);

// 删除资源
router.post('/delete/:s_id', recomController.deleteRecom);

// 手动导出 JSON
router.get('/export-json', recomController.exportJson);

module.exports = router;