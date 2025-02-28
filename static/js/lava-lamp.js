class LavaLamp {
    constructor(options) {
        // 配置项
        this.container = options.container;
        this.width = options.width || 120;
        this.height = options.height || 200;
        this.fallbackImage = options.fallbackImage || '/images/lavalamp.png';
        this.audio = options.audio || new Audio('/audio/vine-boom.mp3');
        this.memoryMode = options.memoryMode || false;
        this.numBlobs = options.numBlobs || 8;

        // 创建canvas元素
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.className = 'lava-lamp-canvas';
        this.ctx = this.canvas.getContext('2d');

        // 创建图像作为备用
        this.fallbackImg = document.createElement('img');
        this.fallbackImg.src = this.fallbackImage;
        this.fallbackImg.className = 'lava-lamp-image';
        this.fallbackImg.alt = "Lava Lamp";
        this.fallbackImg.style.display = 'none'; // 默认隐藏图像

        // 添加两个元素到容器
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.fallbackImg);

        // 检查Canvas是否可用
        this.canvasSupported = this.isCanvasSupported();

        if (this.canvasSupported) {
            // Canvas可用，初始化动画
            this.initAnimation();
        } else {
            // Canvas不可用，使用备用图像
            this.canvas.style.display = 'none';
            this.fallbackImg.style.display = 'block';
        }

        // 设置点击事件
        this.container.addEventListener('click', this.handleClick.bind(this));
    }

    // 检查Canvas是否受支持
    isCanvasSupported() {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    }

    // 初始化动画
    initAnimation() {
        // 创建气泡
        this.blobs = [];
        for (let i = 0; i < this.numBlobs; i++) {
            this.blobs.push({
                x: Math.random() * this.width,
                y: this.height - Math.random() * this.height / 2,
                radius: 15 + Math.random() * 25,
                speedX: Math.random() * 1 - 0.5,
                speedY: -0.3 - Math.random() * 0.7,
                color: this.getRandomColor(),
                phase: Math.random() * Math.PI * 2, // 用于波动效果
                amplitude: 0.2 + Math.random() * 0.8 // 波动幅度
            });
        }

        // 底部颜色
        this.baseGradient = this.ctx.createLinearGradient(0, this.height * 0.7, 0, this.height);
        this.baseGradient.addColorStop(0, 'rgba(80, 20, 100, 0.6)');
        this.baseGradient.addColorStop(1, 'rgba(30, 10, 40, 0.8)');

        // 容器外观
        this.glassGradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
        this.glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        this.glassGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        this.glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');

        // 启动动画
        this.lastTime = performance.now();
        this.animate();

        // 颜色更新
        if (this.memoryMode) {
            setInterval(() => this.updateMemoryColors(), 1000);
        } else {
            setInterval(() => {
                const randomBlob = this.blobs[Math.floor(Math.random() * this.blobs.length)];
                randomBlob.color = this.getRandomColor();
            }, 3000);
        }
    }

    // 随机颜色生成
    getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.random() * 30;
        const lightness = 50 + Math.random() * 30;
        return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
    }

    // 根据内存使用更新颜色
    updateMemoryColors() {
        try {
            if (window.performance && window.performance.memory) {
                const memory = window.performance.memory;
                const usedHeapRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit || 0.5;

                this.blobs.forEach(blob => {
                    // 从120(绿色)到0(红色)，或者到240(蓝色)
                    let hue;
                    if (usedHeapRatio < 0.5) {
                        // 低使用率 - 从蓝色到绿色
                        hue = 240 - (usedHeapRatio * 2) * 120;
                    } else {
                        // 高使用率 - 从绿色到红色
                        hue = 120 - ((usedHeapRatio - 0.5) * 2) * 120;
                    }

                    blob.color = `hsla(${hue}, 80%, 60%, 0.8)`;
                });
            } else {
                // 随机变色
                this.randomizeColors();
            }
        } catch (e) {
            console.warn("无法访问内存API，切换到随机颜色模式", e);
            this.randomizeColors();
        }
    }

    // 随机更改颜色
    randomizeColors() {
        this.blobs.forEach(blob => {
            if (Math.random() < 0.2) {
                blob.color = this.getRandomColor();
            }
        });
    }

    // 处理点击事件
    handleClick() {
        // 播放音效
        if (this.audio) {
            this.audio.currentTime = 0;
            this.audio.play().catch(e => console.warn("无法播放音效:", e));
        }

        // 点击效果 - 改变所有气泡颜色并加速
        this.blobs.forEach(blob => {
            blob.color = this.getRandomColor();
            blob.speedY = -1 - Math.random() * 1.5; // 加速上升
        });

        // 添加脉冲动画
        this.container.classList.add('pulse');
        setTimeout(() => {
            this.container.classList.remove('pulse');
        }, 500);
    }

    // 动画循环
    animate(currentTime) {
        if (!this.canvasSupported) return;

        requestAnimationFrame(this.animate.bind(this));

        // 计算帧间隔
        if (!currentTime) currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // 转换为秒
        this.lastTime = currentTime;

        // 限制更新频率
        if (deltaTime > 0.1) return; // 跳过过大的时间间隔

        // 清除画布
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 绘制熔岩灯背景
        this.ctx.fillStyle = 'rgba(10, 5, 15, 0.9)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制底座
        this.ctx.fillStyle = this.baseGradient;
        this.ctx.fillRect(0, this.height * 0.85, this.width, this.height * 0.15);

        // 更新并绘制每个气泡
        for (let blob of this.blobs) {
            // 添加波动效果
            blob.phase += deltaTime * 2;
            const waveX = Math.sin(blob.phase) * blob.amplitude * 2;

            // 更新位置
            blob.x += (blob.speedX + waveX) * deltaTime * 60;
            blob.y += blob.speedY * deltaTime * 60;

            // 边界检测
            if (blob.x < blob.radius) {
                blob.x = blob.radius;
                blob.speedX = Math.abs(blob.speedX) * 0.8;
            }
            if (blob.x > this.width - blob.radius) {
                blob.x = this.width - blob.radius;
                blob.speedX = -Math.abs(blob.speedX) * 0.8;
            }

            // 当到达顶部时逐渐下沉
            if (blob.y < blob.radius) {
                blob.speedY = Math.abs(blob.speedY) * 0.2;
                blob.y = blob.radius;
            }

            // 当到达底部时上升
            if (blob.y > this.height * 0.85 - blob.radius) {
                blob.y = this.height * 0.85 - blob.radius;
                blob.speedY = -Math.abs(blob.speedY) * 0.8;
            }

            // 减速 (模拟阻力)
            blob.speedX *= 0.99;
            blob.speedY *= 0.98;

            // 随机移动
            if (Math.random() < 0.01) {
                blob.speedX += (Math.random() - 0.5) * 0.5;
                if (blob.y > this.height * 0.5) {
                    // 底部气泡更可能上升
                    blob.speedY -= Math.random() * 0.5;
                }
            }

            // 绘制气泡
            this.ctx.beginPath();
            this.ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);

            // 添加光晕效果
            const gradient = this.ctx.createRadialGradient(
                blob.x, blob.y, 0,
                blob.x, blob.y, blob.radius
            );

            // 更亮的中心
            const color = blob.color.replace('hsla', 'hsl').replace(/, [0-9.]+\)/, ', 1)');
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.7, blob.color);
            gradient.addColorStop(1, 'rgba(20, 10, 30, 0.1)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // 添加高光
            this.ctx.beginPath();
            this.ctx.arc(blob.x - blob.radius * 0.3, blob.y - blob.radius * 0.3, blob.radius * 0.2, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fill();
        }

        // 绘制玻璃反光效果
        this.ctx.fillStyle = this.glassGradient;
        this.ctx.fillRect(this.width * 0.1, 0, this.width * 0.2, this.height);

        // 绘制熔岩灯顶部
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2, 0, this.width / 2, 0, Math.PI, true);
        this.ctx.fillStyle = 'rgba(40, 20, 60, 0.9)';
        this.ctx.fill();
    }
}

// 页面加载完成后初始化熔岩灯
document.addEventListener('DOMContentLoaded', () => {
    // 创建容器
    const lavaLampContainer = document.createElement('div');
    lavaLampContainer.className = 'lava-lamp-container';
    document.body.appendChild(lavaLampContainer);

    // 创建音频元素
    const audio = new Audio('/audio/vine-boom.mp3');

    // 尝试预加载音频
    audio.preload = 'auto';

    // 初始化熔岩灯
    new LavaLamp({
        container: lavaLampContainer,
        width: 120,
        height: 200,
        fallbackImage: '/images/lavalamp.png',
        audio: audio,
        memoryMode: true, // 内存模式
        numBlobs: 8
    });
});
