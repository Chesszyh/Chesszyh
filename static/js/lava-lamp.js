class LavaLamp {
    constructor(options) {
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.blobs = [];
        this.numBlobs = options.numBlobs || 6;
        this.baseColor = options.baseColor || '#800080';
        this.audio = options.audio || null;
        this.memoryMode = options.memoryMode || false;

        // 初始化熔岩灯气泡
        for (let i = 0; i < this.numBlobs; i++) {
            this.blobs.push({
                x: Math.random() * this.width,
                y: this.height - Math.random() * this.height / 3,
                radius: 20 + Math.random() * 30,
                speedX: Math.random() * 2 - 1,
                speedY: -0.5 - Math.random() * 0.5,
                color: this.getRandomColor()
            });
        }

        // 设置点击事件
        this.canvas.addEventListener('click', () => {
            if (this.audio) {
                this.audio.currentTime = 0;
                this.audio.play();
            }
            // 点击时改变所有气泡的颜色
            this.blobs.forEach(blob => {
                blob.color = this.getRandomColor();
            });
        });

        // 启动动画
        this.animate();

        // 如果在内存模式下，每秒更新一次颜色
        if (this.memoryMode) {
            setInterval(() => this.updateMemoryColors(), 1000);
        } else {
            // 每5秒随机改变一个气泡的颜色
            setInterval(() => {
                const randomBlob = this.blobs[Math.floor(Math.random() * this.blobs.length)];
                randomBlob.color = this.getRandomColor();
            }, 5000);
        }
    }

    getRandomColor() {
        // 随机生成亮丰富的颜色
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 80%, 60%)`;
    }

    updateMemoryColors() {
        // 尝试获取内存使用情况（通过性能API）
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const usedHeapRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

            // 根据内存使用情况改变颜色
            // 低使用率 - 绿色，高使用率 - 红色
            this.blobs.forEach(blob => {
                const hue = (1 - usedHeapRatio) * 120; // 从120(绿色)到0(红色)
                blob.color = `hsl(${hue}, 80%, 60%)`;
            });
        } else {
            // 如果无法获取内存信息，就随机变化颜色
            this.blobs.forEach(blob => {
                if (Math.random() < 0.2) { // 20%的几率改变颜色
                    blob.color = this.getRandomColor();
                }
            });
        }
    }

    animate() {
        // 清除画布
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 绘制底部
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.8)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 更新并绘制每个气泡
        for (let blob of this.blobs) {
            // 更新位置
            blob.x += blob.speedX;
            blob.y += blob.speedY;

            // 边界检测
            if (blob.x < blob.radius) {
                blob.x = blob.radius;
                blob.speedX *= -1;
            }
            if (blob.x > this.width - blob.radius) {
                blob.x = this.width - blob.radius;
                blob.speedX *= -1;
            }

            // 当到达顶部时逐渐下沉
            if (blob.y < blob.radius) {
                blob.speedY = Math.abs(blob.speedY) * 0.5;
                blob.y = blob.radius;
            }

            // 当到达底部时上升
            if (blob.y > this.height - blob.radius) {
                blob.speedY = -Math.abs(blob.speedY);
                blob.y = this.height - blob.radius;
            }

            // 添加一些随机运动
            if (Math.random() < 0.02) {
                blob.speedX = Math.random() * 2 - 1;
                blob.speedY = -0.5 - Math.random() * 0.5;
            }

            // 绘制气泡
            this.ctx.beginPath();
            this.ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);

            // 添加光晕效果
            const gradient = this.ctx.createRadialGradient(
                blob.x, blob.y, 0,
                blob.x, blob.y, blob.radius
            );
            gradient.addColorStop(0, blob.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        // 继续动画循环
        requestAnimationFrame(() => this.animate());
    }
}

// 页面加载完成后初始化熔岩灯
document.addEventListener('DOMContentLoaded', () => {
    // 创建容器
    const lavaLampContainer = document.createElement('div');
    lavaLampContainer.className = 'lava-lamp-container';
    document.body.appendChild(lavaLampContainer);
    
    // 创建图像元素替代Canvas
    const lavaLampImg = document.createElement('img');
    lavaLampImg.src = '/images/lavalamp.png';
    lavaLampImg.className = 'lava-lamp-image';
    lavaLampImg.alt = "Lava Lamp";
    lavaLampContainer.appendChild(lavaLampImg);
    
    // 创建音频元素
    const audio = new Audio('/audio/vine-boom.mp3');
    
    // 添加点击事件
    lavaLampContainer.addEventListener('click', () => {
        audio.currentTime = 0;
        audio.play();
        
        // 添加简单动画效果
        lavaLampImg.classList.add('pulse');
        setTimeout(() => {
            lavaLampImg.classList.remove('pulse');
        }, 500);
    });
});
