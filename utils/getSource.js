const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 基础配置
const base_uri = "http://72.11.150.200:37412";
const API_URLS = {
  movie: "/api/douban/movie/top/全部",
  drama: "/api/douban/tv/drama/全部",
  variety: "/api/douban/tv/variety/全部"
};

async function fetchAndSave(type) {

  try {
    // 1. 检查类型是否合法
    if (!API_URLS[type]) {
      throw new Error(`不支持的类型：${type}`);
    }

    const url = base_uri + API_URLS[type];
    console.log(`正在请求：${url}`);

    const response = await axios.get(url, { timeout: 15000 });
    const data = response.data;

    const fileName = `${type}_data.js`;
    const filePath = path.join(process.env.DIST_PATH, fileName);
    let str_data = JSON.stringify(data, null, 2);
    let td = `window.${type}_data =` +  str_data + ";"; 
    await fs.writeFile(filePath, td, 'utf8');

    console.log(`✅ ${type} 数据保存成功：${filePath}`);
    return { success: true, type, filePath };

  } catch (error) {
    console.error(`❌ ${type} 请求/保存失败：`, error);
    return { success: false, type, error: error.message };
  }
}

// 三个专用方法
const getMovieData = () => fetchAndSave('movie');
const getDramaData = () => fetchAndSave('drama');
const getVarietyData = () => fetchAndSave('variety');

/**
 * 一次性抓取所有数据
 */
exports.fetchAll = async function () {
  console.log('🚀 开始批量抓取豆瓣数据...\n');
  await Promise.all([
    getMovieData(),
    getDramaData(),
    getVarietyData()
  ]);
  let source_str = "";
  for (let type in API_URLS) {
    let filePath = path.join(process.env.DIST_PATH, `${type}_data.js`);
    let str = await fs.readFile(filePath, 'utf8')
    source_str += str;
    await fs.unlink(filePath);
  }
  let save_path = path.join(process.env.DIST_PATH, 'source_data.js');
  await fs.writeFile(save_path, source_str, 'utf8');
  console.log('\n🎉 全部任务执行完成');
}
