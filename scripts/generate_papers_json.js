const fs = require('fs');
const path = require('path');

// 递归读取目录中的所有metadata.json文件
function readMetadataFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 如果是年份目录，继续递归
      readMetadataFiles(filePath, fileList);
    } else if (file === 'metadata.json') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 生成合并的papers_data.json
function generatePapersJson() {
  const papersDir = './papers';  // 论文根目录
  const outputFile = './papers_data.json';

  if (!fs.existsSync(papersDir)) {
    console.error(`目录 ${papersDir} 不存在`);
    return;
  }

  const metadataFiles = readMetadataFiles(papersDir);
  const allPapers = [];

  metadataFiles.forEach(filePath => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const paperData = JSON.parse(data);

      // 计算HTML文件路径
      const relativePath = path.relative('./papers', path.dirname(filePath));
      paperData.htmlFile = `${relativePath}/index.html`;

      // 确保所有必需字段都存在
      if (!paperData.id) {
        // 从路径中提取ID
        const dirName = path.basename(path.dirname(filePath));
        paperData.id = dirName;
      }

      // 从路径中提取年份（如果metadata中没有）
      if (!paperData.year) {
        const yearDir = path.dirname(path.dirname(filePath));
        const year = path.basename(yearDir);
        if (/^\d{4}$/.test(year)) {
          paperData.year = parseInt(year);
        }
      }

      allPapers.push(paperData);
      console.log(`已添加: ${paperData.title} (${paperData.year})`);
    } catch (error) {
      console.error(`读取文件 ${filePath} 时出错:`, error);
    }
  });

  // 按年份排序（最新的在前）
  allPapers.sort((a, b) => b.year - a.year);

  // 创建包含时间戳的数据结构
  const outputData = {time: Date.now(), papers: allPapers};

  // 写入合并的JSON文件
  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`\n成功生成 ${outputFile}`);
  console.log(`时间戳: ${new Date(outputData.time).toLocaleString()}`);
  console.log(`总共合并了 ${allPapers.length} 篇论文`);

  // 生成统计信息
  const yearStats = {};
  allPapers.forEach(paper => {
    yearStats[paper.year] = (yearStats[paper.year] || 0) + 1;
  });

  console.log('\n年份统计:');
  Object.keys(yearStats).sort().reverse().forEach(year => {
    console.log(`  ${year}: ${yearStats[year]} 篇`);
  });
}

// 运行脚本
generatePapersJson();