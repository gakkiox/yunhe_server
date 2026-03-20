const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function md5(str) {
  try {
    const val = crypto.createHash('md5')
      .update(str, 'utf8')
      .digest('hex');
    return val;
  } catch (err) {
    console.error('生成 MD5 失败：', err.message);
    return 'default7';
  }
}
// 文章列表接口
router.post('/up', (req,res)=>{
  const mima = "UIop12#$..";
  let md5M = md5(mima);
  let { md5_data } = req.body;
  if(md5_data!==md5M){
    return res.json({ code: 500, message: '登陆失败', data: null });
  }
  res.json({
    code: 200,
    message: '登录成功',
    data: { page: "pan_IUsWZevDf5kk2.html" } 
  });
});

module.exports = router;