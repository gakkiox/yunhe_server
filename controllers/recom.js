const { db } = require('../config/db');
const { saveDbDataToJson } = require('../utils/schedule');

// 新增资源
exports.addRecom = (req, res) => {
  const { name, pan_type, link, date, s_id, pwd } = req.body;

  // 参数校验
  if (!name || !pan_type || !link || !date || !s_id || !pwd) {
    return res.status(400).json({
      code: 400,
      msg: "所有字段均为必填项！",
      data: null
    });
  }

  // 插入数据
  const sql = `INSERT INTO recommendation (name, pan_type, link, date, s_id, pwd) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [name, pan_type, link, date, s_id, pwd], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          code: 400,
          msg: `资源ID ${s_id} 已存在！`,
          data: null
        });
      }
      return res.status(500).json({
        code: 500,
        msg: "服务器内部错误",
        data: null
      });
    }

    // 新增后自动导出 JSON
    saveDbDataToJson().catch(err => console.error('❌ 新增后导出JSON失败：', err.msg));

    res.status(200).json({
      code: 200,
      msg: "资源新增成功",
      data: { id: this.lastID, name, pan_type, link, date, s_id, pwd }
    });
  });
};

// 查询所有资源
exports.getRecomList = (req, res) => {
  const sql = "SELECT * FROM recommendation ORDER BY id DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        msg: "查询失败",
        data: null
      });
    }
    res.status(200).json({
      code: 200,
      msg: "查询成功",
      data: rows
    });
  });
};

// 根据 s_id 查询单个资源
exports.getRecomDetail = (req, res) => {
  const { s_id } = req.params;
  const sql = "SELECT * FROM recommendation WHERE s_id = ?";
  db.get(sql, [s_id], (err, row) => {
    if (err) {
      return res.status(500).json({
        code: 500,
        msg: "查询失败",
        data: null
      });
    }
    if (!row) {
      return res.status(404).json({
        code: 404,
        msg: `未找到资源ID ${s_id}`,
        data: null
      });
    }
    res.status(200).json({
      code: 200,
      msg: "查询成功",
      data: row
    });
  });
};

// 更新资源
exports.updateRecom = (req, res) => {
  const { s_id } = req.params;
  const { name, pan_type, link, date, pwd } = req.body;

  // 参数校验
  if (!name && !pan_type && !link && !date && !pwd) {
    return res.status(400).json({
      code: 400,
      msg: "至少传递一个要修改的字段！",
      data: null
    });
  }

  // 检查资源是否存在
  const checkSql = "SELECT * FROM recommendation WHERE s_id = ?";
  db.get(checkSql, [s_id], (err, row) => {
    if (err) return res.status(500).json({ code: 500, msg: "查询失败", data: null });
    if (!row) return res.status(404).json({ code: 404, msg: `未找到资源ID ${s_id}`, data: null });

    // 构建更新 SQL
    let updateFields = [];
    let updateParams = [];
    if (name) { updateFields.push("name = ?"); updateParams.push(name); }
    if (pan_type) { updateFields.push("pan_type = ?"); updateParams.push(pan_type); }
    if (link) { updateFields.push("link = ?"); updateParams.push(link); }
    if (date) { updateFields.push("date = ?"); updateParams.push(date); }
    if (pwd) { updateFields.push("pwd = ?"); updateParams.push(pwd); }
    updateParams.push(s_id);

    const updateSql = `UPDATE recommendation SET ${updateFields.join(', ')} WHERE s_id = ?`;
    db.run(updateSql, updateParams, function (err) {
      if (err) return res.status(500).json({ code: 500, msg: "更新失败", data: null });

      // 更新后查询最新数据
      db.get(checkSql, [s_id], (err, updatedRow) => {
        if (err) return res.status(500).json({ code: 500, msg: "查询更新后数据失败", data: null });
        
        // 更新后自动导出 JSON
        saveDbDataToJson().catch(err => console.error('❌ 更新后导出JSON失败：', err.msg));

        res.status(200).json({
          code: 200,
          msg: `资源ID ${s_id} 更新成功`,
          data: updatedRow
        });
      });
    });
  });
};

// 删除资源
exports.deleteRecom = (req, res) => {
  const { s_id } = req.params;
  const sql = "DELETE FROM recommendation WHERE s_id = ?";
  
  db.run(sql, [s_id], function (err) {
    if (err) return res.status(500).json({ code: 500, msg: "删除失败", data: null });
    if (this.changes === 0) return res.status(404).json({ code: 404, msg: `未找到资源ID ${s_id}`, data: null });

    // 删除后自动导出 JSON
    saveDbDataToJson().catch(err => console.error('❌ 删除后导出JSON失败：', err.msg));

    res.status(200).json({
      code: 200,
      msg: `资源ID ${s_id} 删除成功`,
      data: { s_id }
    });
  });
};

// 手动导出 JSON
exports.exportJson = async (req, res) => {
  try {
    const result = await saveDbDataToJson();
    res.status(200).json({ code: 200, msg: result.msg, data: result.data });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.msg, data: null });
  }
};