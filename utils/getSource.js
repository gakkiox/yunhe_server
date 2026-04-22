const axios = require('axios');
const fsp = require('fs').promises;
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { db } = require('../config/db.js');
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
  let filelist = [];
  for (let type in API_URLS) {
    let filePath = path.join(process.env.DIST_PATH, `${type}_data.js`);
    filelist.push(filePath)
    let str = await fsp.readFile(filePath, 'utf8');
    let dat = JSON.parse(str);
    await getpic(dat)
    let str_data = `window.${type}_data =` + JSON.stringify(dat, null, 2) + ";";
    source_str += str_data;
  }
  for (let f of filelist) {
    await fsp.unlink(f);
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
    await addMovieItem(item);
    return;
    await getpicHandle(api, image_url);
    item.pic.pan = `https://nfs.useai.sbs/douban_pic/${image_url.split('/').pop()}`
  }


}
async function addMovieItem(item) {
  try {
    await db.run(`
      INSERT OR IGNORE INTO  movies (
        id, title,
        rating_count, rating_max, rating_star, rating_value,
        pic_large, pic_normal, pic_pan,
        is_new, uri, episodes_info, card_subtitle, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id,
      item.title,
      item.rating?.count || 0,
      item.rating?.max || 10,
      item.rating?.star_count || 0,
      item.rating?.value || 0,
      item.pic?.large || '',
      item.pic?.normal || '',
      item.pic?.pan || '',
      item.is_new ? 1 : 0,
      item.uri || '',
      item.episodes_info || '',
      item.card_subtitle || '',
      item.type || ''
    ]);
  } catch (err) {
    console.error('保存失败:', err);
    return null;
  }
}
function getEnv() {
  // Cloudflare R2 配置
  const R2_CONFIG = {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: process.env.R2_PUBLIC_URL || ''
  };

  // 创建 S3 客户端（R2 兼容 S3 API）
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey
    }
  });
  return {
    R2_CONFIG,
    s3Client
  }
}
async function getpicHandle(api, image_url) {
  try {
    const fileName = image_url.split('/').pop();
    const key = `douban_pic/${fileName}`;
    const { R2_CONFIG, s3Client } = getEnv();

    // 检查文件是否已存在
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key
      }));
      console.log(`图片已存在，跳过: ${fileName}`);
      return;
    } catch (err) {
      // 文件不存在，继续上传
    }

    // 下载图片
    const response = await api.get(image_url);
    const chunks = [];
    for await (const chunk of response.data) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 获取文件扩展名和 Content-Type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    // 上传到 R2
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    }));

    console.log(`图片上传成功: ${fileName}`);
  } catch (err) {
    console.error('请求图片或上传失败：', err.message);
  }
}