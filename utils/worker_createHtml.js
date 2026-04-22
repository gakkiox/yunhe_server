const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { db, closeDb } = require('../config/db');

/**
 * 从数据库获取所有电影数据
 */
function getAllMovies() {
  const sql = "SELECT * FROM movies";
  return new Promise((resolve, reject) => {
    db.all(sql, (error, rows) => {
      if (error) {
        console.error('❌ 查询电影数据失败:', error.message);
        reject(error);
      } else {
        console.log(`✅ 查询到 ${rows.length} 条电影数据`);
        resolve(rows);
      }
    });
  });
}

/**
 * 根据电影ID获取推荐电影列表（同类型的其他电影）
 */
function getRecommendations(movieId, type, limit = 3) {
  const sql = "SELECT * FROM movies WHERE type = ? AND id != ? LIMIT ?";
  return new Promise((resolve, reject) => {
    db.all(sql, [type, movieId, limit], (error, rows) => {
      if (error) {
        console.error('❌ 查询推荐电影失败:', error.message);
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * 根据类型获取电影列表
 */
function getMoviesByType(type) {
  const sql = type ? "SELECT * FROM movies WHERE type = ? ORDER BY rating_value DESC" : "SELECT * FROM movies ORDER BY rating_value DESC";
  return new Promise((resolve, reject) => {
    db.all(sql, type ? [type] : [], (error, rows) => {
      if (error) {
        console.error('❌ 查询电影列表失败:', error.message);
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * 生成单个电影的HTML文件
 */
async function generateMovieHtml(movie) {
  try {
    // 输出目录
    const outputPath = path.join(process.env.DIST_PATH || process.cwd(), '/movies');
    
    // 创建输出目录（如果不存在）
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      console.log(`✅ 已创建输出目录：${outputPath}`);
    }

    // 生成文件名（使用电影ID或标题）
    const fileName = `${movie.id}.html`;
    const filePath = path.join(outputPath, fileName);

    // 如果文件已存在，跳过生成
    if (fs.existsSync(filePath)) {
      console.log(`⚠️ 文件已存在，跳过生成：${filePath}`);
      return true;
    }

    // 模板路径
    const templatePath = path.join(process.cwd(), '/template/movie_detail.html');

    // 获取推荐电影列表
    const recommendations = await getRecommendations(movie.id, movie.type, 3);
    let type_obj = {'tv':"剧集", 'movie':"电影"};
    let type_origin =movie.type || 'movie' ;
    let type = type_obj[type_origin];
    // 准备模板数据
    const templateData = {
      movie: {
        id: movie.id,
        title: movie.title,
        rating_count: movie.rating_count || 0,
        rating_max: movie.rating_max || 10,
        rating_star: movie.rating_star || 0,
        rating_value: movie.rating_value || 0,
        pic_large: movie.pic_large || '',
        pic_normal: movie.pic_normal || '',
        pic_pan: movie.pic_pan || '',
        is_new: movie.is_new,
        uri: movie.uri || '',
        episodes_info: movie.episodes_info || '',
        card_subtitle: movie.card_subtitle || '',
        type
      },
      recommendations: recommendations,
      // SEO 相关数据
      seoTitle: `${movie.title} 网盘资源_高清完整版_免费在线观看 - 云河搜索`,
      seoDescription: `云河搜索为你提供${movie.title} 高清网盘资源、免费在线观看、迅雷下载，包含完整无删减版、1080P/4K蓝光资源，专业网盘资源搜索引擎。`,
      seoKeywords: `${movie.title},${movie.title}网盘,${movie.title}资源,${movie.title}下载,高清电影,网盘搜索,云河搜索`
    };

    // 渲染 EJS 模板
    const htmlContent = await ejs.renderFile(templatePath, templateData, {
      async: false
    });

    // 写入文件
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`✅ 电影HTML生成成功：${filePath}`);

    return true;
  } catch (error) {
    console.error(`❌ 生成电影HTML失败 (${movie.title}):`, error.message);
    return false;
  }
}

/**
 * 生成电影列表HTML文件
 */
async function generateMovieListHtml(type = null) {
  try {
    // 输出目录
    const outputPath = path.join(process.env.DIST_PATH || process.cwd(), '/movies');
    
    // 创建输出目录（如果不存在）
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      console.log(`✅ 已创建输出目录：${outputPath}`);
    }

    // 获取电影列表
    const movies = await getMoviesByType(type);
    
    // 确定页面类型和标题
    let pageType, pageTitle, fileName;
    if (type === 'tv') {
      pageType = '剧集';
      pageTitle = '热门剧集大全';
      fileName = 'tv_list.html';
    } else if (type === 'movie') {
      pageType = '电影';
      pageTitle = '热门电影大全';
      fileName = 'movie_list.html';
    } else {
      pageType = '影视';
      pageTitle = '全部影视大全';
      fileName = 'index.html';
    }

    const filePath = path.join(outputPath, fileName);

    // 模板路径
    const templatePath = path.join(process.cwd(), '/template/movie_list.html');

    // 准备模板数据
    const templateData = {
      movies: movies,
      pageType: pageType,
      pageTitle: pageTitle
    };

    // 渲染 EJS 模板
    const htmlContent = await ejs.renderFile(templatePath, templateData, {
      async: false
    });

    // 写入文件
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`✅ ${pageType}列表HTML生成成功：${filePath}（共 ${movies.length} 部）`);

    return true;
  } catch (error) {
    console.error(`❌ 生成${type || '全部'}列表HTML失败:`, error.message);
    return false;
  }
}

/**
 * 主函数：生成所有电影的HTML文件
 */
async function generateAllMovieHtml() {
  console.log('🚀 开始生成电影HTML页面...');
  
  try {
    // 获取所有电影
    const movies = await getAllMovies();
    
    if (movies.length === 0) {
      console.log('ℹ️ 没有需要处理的电影数据');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 逐个生成HTML文件
    for (const movie of movies) {
      const success = await generateMovieHtml(movie);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // 添加小延迟，避免过快处理
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ 电影详情HTML生成完成！`);
    console.log(`   - 成功: ${successCount} 个`);
    console.log(`   - 失败: ${failCount} 个`);
    console.log(`   - 总计: ${movies.length} 个\n`);

    // 生成列表页
    console.log('📋 开始生成列表页面...');
    await generateMovieListHtml(null);  // 全部影视
    await generateMovieListHtml('movie'); // 电影列表
    await generateMovieListHtml('tv');    // 剧集列表
    console.log('✅ 列表页面生成完成！\n');
  } catch (error) {
    console.error('❌ 生成电影HTML过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    await closeDb();
    console.log('👋 子进程退出');
    process.exit(0);
  }
}

// 如果是直接运行此文件（作为子进程）
if (require.main === module) {
  generateAllMovieHtml();
}

// 导出函数供其他模块使用
module.exports = {
  generateAllMovieHtml,
  generateMovieHtml,
  generateMovieListHtml,
  getAllMovies
};
