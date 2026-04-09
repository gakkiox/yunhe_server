const axios = require('axios');
const fsp = require('fs').promises;
const fs = require('fs');
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
    await fsp.writeFile(filePath, str_data, 'utf8');

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
    let str = await fsp.readFile(filePath, 'utf8');
    let dat = JSON.parse(str);
    await getpic(dat)
    let str_data =   `window.${type}_data =` + JSON.stringify(dat, null, 2) + ";";
    source_str += str_data;
    await fsp.unlink(filePath);
  }
  let save_path = path.join(process.env.DIST_PATH, 'source_data.js');
  await fsp.writeFile(save_path, source_str, 'utf8');
  console.log('\n🎉 全部任务执行完成');
}

async function getpic(source) {

  // 修正 baseURL 错误（原代码中 this 指向问题），此处直接在请求时指定完整 URL，故可设为空
  const api = axios.create({
    baseURL: '',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Referer': 'https://m.douban.com/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    },
    // 关键：指定响应类型为二进制流，否则会乱码
    responseType: 'stream'
  })
  for (let item of source.data.items) {
    let image_url = item.pic.large;
    await getpicHandle(api, image_url)
    item.pic.pan = `https://pan.useai.sbs/douban_pic/${image_url.split('/').pop()}`
  }


}

async function getpicHandle(api, image_url) {
  try {
    const res = await api.get(image_url);
    // 定义保存路径和文件名
    let file_name = image_url.split('/').pop();
    // 上传至 cloudflare  R2 存储
    let saveDirPath = path.join(process.env.DIST_PATH, "douban_pic");
    await fsp.mkdir(saveDirPath, { recursive: true });
    let savePath = path.join(saveDirPath, file_name);
    if (fs.existsSync(savePath)) {
      console.log('✅ 图片已存在，跳过下载：', savePath);
      return;
    }
    // 创建可写流，将响应流写入文件
    const writer = fs.createWriteStream(savePath);
    res.data.pipe(writer);

    // 监听写入完成/错误事件
    writer.on('finish', () => {
      console.log('图片保存成功！路径：', savePath);
    });

    writer.on('error', (err) => {
      console.error('图片保存失败：', err);
    });

  } catch (err) {
    console.error('请求图片失败：', err);
  }
}