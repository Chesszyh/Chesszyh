/**
 * 图像替换脚本
 * 
 * 使用方法：
 * 1. 在根目录的static/images中放置您的PNG图像
 * 2. 在此配置图像映射关系
 * 3. 将此脚本加入head.html
 */

document.addEventListener('DOMContentLoaded', () => {
  // 配置要替换的图像映射
  const imageMapping = {
    // 示例: '/images/原始图像路径.webp': '/images/新图像路径.png'
    '/images/banner.webp': '/images/banner.png',
    // 添加更多映射...
  };

  // 替换所有图像
  document.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && imageMapping[src]) {
      img.setAttribute('src', imageMapping[src]);
    }
  });

  // 替换CSS背景图像(针对常见的内联样式)
  document.querySelectorAll('[style*="background-image"]').forEach(el => {
    const style = el.getAttribute('style');
    if (style) {
      let newStyle = style;
      
      Object.keys(imageMapping).forEach(oldImage => {
        if (style.includes(oldImage)) {
          newStyle = newStyle.replace(oldImage, imageMapping[oldImage]);
        }
      });
      
      el.setAttribute('style', newStyle);
    }
  });
});
