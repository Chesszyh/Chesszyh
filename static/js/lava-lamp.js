class LavaLamp {
    constructor(options) {
        // 配置项
        this.container = options.container;
        this.width = options.width || 120;
        this.height = options.height || 200;
        this.fallbackImage = options.fallbackImage || '/image/lavalamp.png';
        this.audioSrc = options.audio ? options.audio.src : '/audio/vine-boom.mp3';
        this.memoryMode = options.memoryMode || false;
        this.numBlobs = options.numBlobs || 8;

        // 可自定义的视觉效果参数
        this.visuals = {
            // 气泡相关参数
            blobMinRadius: options.blobMinRadius || 15,
            blobMaxRadius: options.blobMaxRadius || 40,
            blobSpeed: options.blobSpeed || 1.0,  // 速度倍率
            blobWaveAmplitude: options.blobWaveAmplitude || 0.8,  // 波动幅度
            blobOpacity: options.blobOpacity || 0.8,  // 气泡不透明度

            // 颜色相关参数
            baseHue: options.baseHue || 240,  // 基础色调
            colorVariance: options.colorVariance || 20,  // 色调变化范围
            colorTransitionSpeed: options.colorTransitionSpeed || 0.05,  // 颜色变化速度

            // 背景和容器相关参数
            backgroundColor: options.backgroundColor || 'rgba(10, 5, 15, 0.9)',
            glassOpacity: options.glassOpacity || 0.1,  // 玻璃反光效果不透明度
            shadowIntensity: options.shadowIntensity || 0.4  // 阴影强度
        };

        // 音频播放器池初始化
        this.audioPool = [];
        this.audioPoolSize = 5; // 允许5个音效同时播放
        this.currentAudioIndex = 0;
        this.initAudioPool();

        // 拖拽状态变量
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // 页面活动监控
        this.lastUserActivity = Date.now();
        this.userActivityEvents = ['mousemove', 'click', 'keydown', 'scroll'];
        this.userActivityTracking();

        // 内存利用率历史记录
        this.memoryHistory = [];
        this.colorTransitionSpeed = this.visuals.colorTransitionSpeed;
        this.currentBaseHue = this.visuals.baseHue;
        this.targetBaseHue = this.visuals.baseHue;

        // 恢复位置
        this.loadPosition();

        // 创建UI元素
        this.createElements();

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

        // 设置交互事件
        this.setupEvents();

        // 添加状态指示器（开发中，可以删除）
        this.debugInfo = document.createElement('div');
        this.debugInfo.className = 'lava-lamp-debug';
        if (options.debug) {
            this.container.appendChild(this.debugInfo);
        }

        // 注册重新加载事件 - 用于恢复熔岩灯
        document.addEventListener('reloadLavaLamp', this.handleReload.bind(this));
    }

    // 音频池初始化
    initAudioPool() {
        for (let i = 0; i < this.audioPoolSize; i++) {
            const audio = new Audio(this.audioSrc);
            audio.preload = 'auto';
            audio.volume = 0.7;
            this.audioPool.push(audio);
        }
    }

    // 播放音频（支持堆叠）
    playAudio() {
        // 获取下一个可用的音频实例
        const audio = this.audioPool[this.currentAudioIndex];

        // 重置音频并播放
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("无法播放音效:", e));

        // 更新索引，循环使用音频池
        this.currentAudioIndex = (this.currentAudioIndex + 1) % this.audioPoolSize;
    }

    // 创建UI元素
    createElements() {
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

        // 创建控制面板
        this.controls = document.createElement('div');
        this.controls.className = 'lava-lamp-controls';

        // 关闭按钮
        this.closeBtn = document.createElement('button');
        this.closeBtn.className = 'lava-lamp-close';
        this.closeBtn.innerHTML = '×';
        this.closeBtn.title = '关闭';

        // 添加按钮到控制面板
        this.controls.appendChild(this.closeBtn);

        // 提示条
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'lava-lamp-tooltip';
        this.tooltip.innerHTML = '点击播放音效<br>拖拽移动位置';

        // 添加所有元素到容器
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.fallbackImg);
        this.container.appendChild(this.controls);
        this.container.appendChild(this.tooltip);

        // 添加拖动句柄 - 覆盖整个容器以提高拖动灵敏度
        this.dragHandle = document.createElement('div');
        this.dragHandle.className = 'lava-lamp-drag-handle';
        this.container.appendChild(this.dragHandle);
    }

    // 设置交互事件 - 优化拖拽性能
    setupEvents() {
        // 拖拽事件 - 整个容器可拖拽，提高灵敏度
        this.container.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mousemove', this.onDrag.bind(this), { passive: false });
        document.addEventListener('mouseup', this.stopDrag.bind(this));

        // 触摸事件支持
        this.container.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
        document.addEventListener('touchend', this.stopDrag.bind(this));

        // 熔岩灯点击事件 - 只处理非拖拽的点击
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        // 控制按钮事件
        this.closeBtn.addEventListener('click', this.close.bind(this));

        // 显示/隐藏控制面板
        this.container.addEventListener('mouseenter', () => {
            this.controls.classList.add('show');
            this.tooltip.classList.add('show');
            setTimeout(() => {
                if (this.controls.classList.contains('show')) {
                    this.tooltip.classList.remove('show');
                }
            }, 3000);
        });

        this.container.addEventListener('mouseleave', () => {
            this.controls.classList.remove('show');
            this.tooltip.classList.remove('show');
        });

        // 窗口大小改变时更新位置
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    // 处理重新加载熔岩灯事件
    handleReload() {
        // 显示熔岩灯
        this.container.style.display = 'block';

        // 重置关闭状态
        localStorage.removeItem('lava-lamp-closed');

        // 动画效果
        this.container.classList.add('appear');
        setTimeout(() => {
            this.container.classList.remove('appear');
        }, 500);

        // 重置位置
        this.loadPosition();

        // 气泡动画效果
        if (this.blobs) {
            this.blobs.forEach(blob => {
                blob.speedY = -1 - Math.random();
            });
        }
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
                radius: this.visuals.blobMinRadius + Math.random() * (this.visuals.blobMaxRadius - this.visuals.blobMinRadius),
                speedX: Math.random() * 1 - 0.5,
                speedY: -0.3 - Math.random() * 0.7,
                color: this.getRandomColorWithBaseHue(this.currentBaseHue),
                phase: Math.random() * Math.PI * 2, // 用于波动效果
                amplitude: this.visuals.blobWaveAmplitude * (0.2 + Math.random() * 0.8), // 波动幅度
                targetRadius: null, // 动态大小变化目标
                originalRadius: null // 原始大小记录
            });
        }

        // 底部颜色
        this.baseGradient = this.ctx.createLinearGradient(0, this.height * 0.7, 0, this.height);
        this.baseGradient.addColorStop(0, 'rgba(80, 20, 100, 0.6)');
        this.baseGradient.addColorStop(1, 'rgba(30, 10, 40, 0.8)');

        // 容器外观
        this.glassGradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
        this.glassGradient.addColorStop(0, `rgba(255, 255, 255, ${this.visuals.glassOpacity})`);
        this.glassGradient.addColorStop(0.5, `rgba(255, 255, 255, ${this.visuals.glassOpacity / 2})`);
        this.glassGradient.addColorStop(1, `rgba(255, 255, 255, ${this.visuals.glassOpacity * 1.5})`);

        // 启动动画
        this.lastTime = performance.now();
        this.animate();

        // 颜色更新和内存监控
        this.memoryUpdateInterval = setInterval(() => this.updateMemoryAndColors(), 1000);
    }

    // 优化的拖拽开始
    startDrag(e) {
        // 如果点击的是控制按钮，不启动拖拽
        if (e.target === this.closeBtn) {
            return;
        }

        e.preventDefault();
        this.isDragging = true;
        this.recentDragStart = Date.now();

        // 获取点击/触摸的位置
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        // 保存容器当前位置和鼠标起始位置
        const rect = this.container.getBoundingClientRect();
        this.dragOffsetX = clientX - rect.left;
        this.dragOffsetY = clientY - rect.top;
        this.dragStartX = rect.left;
        this.dragStartY = rect.top;

        // 添加拖动中的样式 - 使用CSS变量存储初始位置
        this.container.style.setProperty('--drag-start-x', `${rect.left}px`);
        this.container.style.setProperty('--drag-start-y', `${rect.top}px`);
        this.container.classList.add('dragging');

        // 波动所有气泡
        if (this.blobs) {
            this.blobs.forEach(blob => {
                blob.speedY -= Math.random() * 0.8;
                blob.speedX += (Math.random() - 0.5) * 1;
            });
        }
    }

    // 优化的拖拽中处理 - 使用transform以提高性能
    onDrag(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        // 获取当前鼠标/触摸位置
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        // 计算新位置
        let newLeft = clientX - this.dragOffsetX;
        let newTop = clientY - this.dragOffsetY;

        // 限制在视窗内
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;

        // 确保不超出视窗边界
        newLeft = Math.max(0, Math.min(windowWidth - containerWidth, newLeft));
        newTop = Math.max(0, Math.min(windowHeight - containerHeight, newTop));

        // 使用transform进行移动，性能更好
        this.container.style.left = `${newLeft}px`;
        this.container.style.top = `${newTop}px`;
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';

        // 移动时摇晃气泡
        if (this.blobs) {
            this.blobs.forEach(blob => {
                blob.speedX += (Math.random() - 0.5) * 0.1;
            });
        }
    }

    // 拖拽结束
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.classList.remove('dragging');

            // 判断是否是一次短暂的点击拖拽
            this.recentlyDragged = Date.now() - this.recentDragStart < 200 ? false : true;

            // 保存新位置
            this.savePosition();

            // 熔岩流动动画
            if (this.blobs) {
                this.blobs.forEach(blob => {
                    blob.originalRadius = blob.radius;
                    blob.targetRadius = blob.radius * (0.8 + Math.random() * 0.4);
                });
            }
        }
    }

    // 处理窗口大小调整
    onWindowResize() {
        // 确保熔岩灯不超出窗口边界
        const rect = this.container.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (rect.right > windowWidth) {
            this.container.style.left = 'auto';
            this.container.style.right = '30px';
        }

        if (rect.bottom > windowHeight) {
            this.container.style.top = 'auto';
            this.container.style.bottom = '30px';
        }

        // 更新位置保存
        this.savePosition();
    }

    // 关闭熔岩灯
    close(e) {
        e.stopPropagation(); // 防止事件冒泡

        // 淡出动画
        this.container.classList.add('closing');

        // 动画结束后隐藏元素
        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.classList.remove('closing');

            // 记住关闭状态
            localStorage.setItem('lava-lamp-closed', 'true');

            // 提供恢复按钮
            this.createRestoreButton();
        }, 500);
    }

    // 创建恢复按钮
    createRestoreButton() {
        // 移除之前的恢复按钮（如果有）
        const existingBtn = document.querySelector('.lava-lamp-restore');
        if (existingBtn) {
            existingBtn.remove();
        }

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'lava-lamp-restore';
        restoreBtn.innerHTML = '恢复熔岩灯';
        restoreBtn.title = '点击恢复熔岩灯';

        document.body.appendChild(restoreBtn);

        restoreBtn.addEventListener('click', () => {
            // 移除恢复按钮
            document.body.removeChild(restoreBtn);

            // 触发恢复事件
            document.dispatchEvent(new CustomEvent('reloadLavaLamp'));
        });
    }

    // 随机颜色生成 - 基于色调
    getRandomColorWithBaseHue(baseHue, variance = this.visuals.colorVariance) {
        const hue = baseHue + (Math.random() - 0.5) * variance * 2;
        const saturation = 70 + Math.random() * 30;
        const lightness = 50 + Math.random() * 30;
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${this.visuals.blobOpacity})`;
    }

    // 更新内存数据和颜色
    updateMemoryAndColors() {
        try {
            // 测量页面性能指标
            let memoryUsage = 0;

            // 尝试获取内存使用情况
            if (window.performance && window.performance.memory) {
                const memory = window.performance.memory;
                memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit || 0.5;
            } else {
                // 回退：模拟内存值，使用时间作为随机种子
                const time = new Date();
                memoryUsage = 0.3 + (Math.sin(time.getSeconds() / 10) + 1) * 0.2;
            }

            // 保存历史数据
            this.memoryHistory.push(memoryUsage);
            if (this.memoryHistory.length > 10) {
                this.memoryHistory.shift();
            }

            // 确定目标色调
            this.determineTargetHue();

            // 平滑过渡当前色调向目标色调
            this.currentBaseHue = this.currentBaseHue + (this.targetBaseHue - this.currentBaseHue) * this.colorTransitionSpeed;

            // 更新调试信息
            if (this.debugInfo) {
                this.debugInfo.textContent = `Memory: ${Math.round(memoryUsage * 100)}% | Hue: ${Math.round(this.currentBaseHue)}`;
            }

            // 随机更新某些气泡颜色
            if (this.blobs) {
                // 随机选择几个气泡更新颜色
                const updateCount = Math.floor(this.blobs.length * 0.3); // 30%的气泡更新
                for (let i = 0; i < updateCount; i++) {
                    const randomIndex = Math.floor(Math.random() * this.blobs.length);
                    this.blobs[randomIndex].color = this.getRandomColorWithBaseHue(this.currentBaseHue);
                }
            }
        } catch (e) {
            console.warn("内存监控错误", e);
        }
    }

    // 确定目标色调 - 基于多种因素
    determineTargetHue() {
        // 各种因素加权计算
        let hue = 240; // 默认蓝色

        // 1. 内存使用率影响 (内存越高，越红)
        const avgMemory = this.memoryHistory.reduce((sum, val) => sum + val, 0) / this.memoryHistory.length;
        const memoryHue = 120 - avgMemory * 120; // 从绿色(120)到红色(0)

        // 2. 用户活动影响
        const timeSinceActivity = Date.now() - this.lastUserActivity;
        const activityFactor = Math.min(1, timeSinceActivity / 10000); // 10秒内算活跃
        const activityHue = activityFactor * 60 + 180; // 活跃紫色(240)到不活跃青色(180)

        // 3. 网页滚动位置影响
        const scrollPosition = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        const scrollHue = 180 + scrollPosition * 120; // 从青色(180)到紫色(300)

        // 4. 时间影响 - 晚上偏暖色
        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour <= 18;
        const timeHue = isDaytime ? 210 : 30; // 白天蓝偏色，晚上黄色

        // 综合因素权重
        hue = (
            memoryHue * 0.5 +    // 内存使用：50%权重
            activityHue * 0.2 +  // 用户活动：20%权重
            scrollHue * 0.2 +    // 滚动位置：20%权重
            timeHue * 0.1        // 时间：10%权重
        );

        this.targetBaseHue = hue;
    }

    // 用户活动监控
    userActivityTracking() {
        // 注册用户活动事件
        this.userActivityEvents.forEach(eventType => {
            window.addEventListener(eventType, () => {
                this.lastUserActivity = Date.now();

                // 如果是滚动事件，更新颜色
                if (eventType === 'scroll') {
                    this.determineTargetHue();
                }

                // 记录活动导致的颜色变化
                if (this.blobs && eventType === 'click') {
                    // 点击时增加额外的波动
                    this.blobs.forEach(blob => {
                        blob.speedY -= Math.random() * 0.5;
                    });
                }
            });
        });
    }

    // 处理点击事件
    handleClick(e) {
        e.stopPropagation(); // 防止传播

        // 忽略拖动后的点击
        if (this.recentlyDragged) {
            this.recentlyDragged = false;
            return;
        }

        // 播放音效 - 使用音频池
        this.playAudio();

        // 点击特效
        this.container.classList.add('pulse');
        setTimeout(() => {
            this.container.classList.remove('pulse');
        }, 500);

        // 获取点击位置
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width;
        const y = (e.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height;

        // 在点击处产生涟漪效果
        this.createRipple(x, y);

        // 气泡反应
        this.blobs.forEach(blob => {
            // 距离点击点越近的气泡反应越强烈
            const dx = blob.x - x;
            const dy = blob.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const impact = Math.max(0, 1 - distance / 100);

            if (impact > 0) {
                // 远离点击点
                const angle = Math.atan2(dy, dx);
                blob.speedX += Math.cos(angle) * impact * 2;
                blob.speedY += Math.sin(angle) * impact * 2;

                // 颜色变化
                blob.color = this.getRandomColorWithBaseHue(this.currentBaseHue, 40);
            }
        });

        // 点击后暂时提高基础活动度
        this.lastUserActivity = Date.now();
    }

    // 创建点击涟漪
    createRipple(x, y) {
        const ripple = {
            x: x,
            y: y,
            radius: 5,
            maxRadius: 50,
            growth: 2,
            opacity: 0.7
        };

        this.ripples = this.ripples || [];
        this.ripples.push(ripple);
    }

    // 更新和渲染涟漪
    updateRipples(deltaTime) {
        if (!this.ripples) return;

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];

            // 扩大半径
            ripple.radius += ripple.growth * deltaTime * 60;

            // 降低不透明度
            ripple.opacity -= 0.01 * deltaTime * 60;

            // 绘制涟漪
            if (ripple.opacity > 0) {
                this.ctx.beginPath();
                this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.opacity})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                // 移除消失的涟漪
                this.ripples.splice(i, 1);
            }
        }
    }

    // 双击事件处理
    handleDoubleClick(e) {
        e.preventDefault();

        // 所有气泡爆发向上
        this.blobs.forEach(blob => {
            blob.speedY = -3 - Math.random() * 2;
            blob.speedX = (Math.random() - 0.5) * 3;
            blob.color = this.getRandomColorWithBaseHue(Math.random() * 360); // 随机色调
        });

        // 特殊效果：爆发
        this.container.classList.add('explode');
        setTimeout(() => {
            this.container.classList.remove('explode');
        }, 800);

        // 重置颜色
        this.currentBaseHue = Math.random() * 360;
        this.targetBaseHue = this.currentBaseHue;

        // 播放音效（更大声）- 使用音频池
        const audio = this.audioPool[this.currentAudioIndex];
        audio.volume = 1.0; // 最大音量
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("无法播放音效:", e));

        this.currentAudioIndex = (this.currentAudioIndex + 1) % this.audioPoolSize;

        setTimeout(() => {
            // 恢复其他音频实例的正常音量
            this.audioPool.forEach(a => a.volume = 0.7);
        }, 1000);
    }

    // 保存位置到本地存储
    savePosition() {
        // 不保存拖动中的临时位置
        if (this.isDragging) return;

        const rect = this.container.getBoundingClientRect();
        const position = {
            left: rect.left,
            top: rect.top,
            right: window.innerWidth - rect.right,
            bottom: window.innerHeight - rect.bottom
        };

        localStorage.setItem('lava-lamp-position', JSON.stringify(position));
    }

    // 从本地存储加载位置
    loadPosition() {
        try {
            // 检查是否应该被关闭
            const isClosed = localStorage.getItem('lava-lamp-closed') === 'true';
            if (isClosed) {
                // 延迟隐藏，以便先完成构造
                setTimeout(() => {
                    this.container.style.display = 'none';
                    this.createRestoreButton();
                }, 0);
                return;
            }

            // 检查保存的位置
            const positionStr = localStorage.getItem('lava-lamp-position');
            if (positionStr) {
                const position = JSON.parse(positionStr);

                // 如果窗口尺寸变化了，可能需要调整
                if (position.left + this.width > window.innerWidth) {
                    position.left = window.innerWidth - this.width - 10;
                }
                if (position.top + this.height > window.innerHeight) {
                    position.top = window.innerHeight - this.height - 10;
                }

                // 设置位置
                this.container.style.left = `${position.left}px`;
                this.container.style.top = `${position.top}px`;
                this.container.style.right = 'auto';
                this.container.style.bottom = 'auto';
            }
        } catch (e) {
            console.warn("无法加载位置", e);
        }
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
        this.ctx.fillStyle = this.visuals.backgroundColor;
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

            // 当到达顶部时逐渐下沉 - 增加重力因素
            if (blob.y < blob.radius) {
                blob.y = blob.radius;
                blob.speedY = Math.abs(blob.speedY) * 0.3; // 轻微弹跳
            }

            // 当到达底部时上升
            if (blob.y > this.height * 0.85 - blob.radius) {
                blob.y = this.height * 0.85 - blob.radius;
                blob.speedY = -Math.abs(blob.speedY) * 0.8;
            }

            // 减速 (模拟阻力)
            blob.speedX *= 0.99;
            blob.speedY *= 0.98;

            // 添加重力效果 - 确保气泡最终会下沉
            blob.speedY += 0.03 * deltaTime * 60;

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

        // 更新涟漪
        this.updateRipples(deltaTime);
    }
}

// 页面加载完成后初始化熔岩灯
document.addEventListener('DOMContentLoaded', () => {
    // 创建容器
    const lavaLampContainer = document.createElement('div');
    lavaLampContainer.className = 'lava-lamp-container';
    document.body.appendChild(lavaLampContainer);

    // 添加CSS样式来优化拖拽性能
    const style = document.createElement('style');
    style.textContent = `
        .lava-lamp-container {
            position: fixed;
            z-index: 9999;
            cursor: pointer;
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .lava-lamp-container.dragging {
            transition: none !important;
            cursor: grabbing;
        }
    `;
    document.head.appendChild(style);

    // 初始化熔岩灯
    new LavaLamp({
        container: lavaLampContainer,
        width: 120,
        height: 200,
        fallbackImage: '/image/lavalamp.png',
        audio: new Audio('/audio/vine-boom.mp3'), // 仅用于传递路径
        memoryMode: true, // 内存模式
        numBlobs: 8
    });
});
