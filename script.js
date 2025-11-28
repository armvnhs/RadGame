// --- انتخاب‌گرهای DOM ---
const introScreen = document.getElementById('intro-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameArea = document.getElementById('game-area');
const nameInput = document.getElementById('player-name-input');
const submitBtn = document.getElementById('submit-name-btn');
const displayName = document.getElementById('display-name');
const scoreVal = document.getElementById('score-val');
const retryBtn = document.getElementById('retry-btn');
const rad = document.getElementById('rad');
const ctrlZIndicator = document.getElementById('ctrl-z-indicator');

// آیکون‌های قدرت
const iconMagnet = document.getElementById('power-magnet');
const iconGhost = document.getElementById('power-ghost');

// --- متغیرهای بازی ---
let playerName = "User";
let isGameRunning = false;
let score = 0;
let gameSpeed = 6;
let gravity = 0.8;
let velocity = 0;
let radBottom = 50;
let radLeft = 60; // موقعیت افقی ثابت راد
let animationId; // برای کنترل requestAnimationFrame

// آرایه‌ها
let obstacles = [];
let keyframes = [];
let powerups = [];

// وضعیت پاور-آپ‌ها
let hasCtrlZ = false; 
let magnetActive = false;
let ghostActive = false;
let magnetTimer, ghostTimer;

// --- رویدادها (Event Listeners) ---

// 1. دکمه شروع (دریافت نام)
submitBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) playerName = name;
    
    introScreen.classList.add('hidden-screen');
    introScreen.classList.remove('active-screen');
    gameArea.style.display = 'block';
    displayName.innerText = playerName;
    
    startGame();
});

// 2. دکمه تلاش مجدد
retryBtn.addEventListener('click', startGame);

// 3. پرش (کیبورد و لمس)
function handleJump(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (!isGameRunning && !gameOverScreen.classList.contains('hidden-screen') && e.type === 'keydown') {
        startGame();
        return;
    }
    if (isGameRunning) {
        // جلوگیری از اسکرول صفحه با Space
        if(e.type === 'keydown') e.preventDefault(); 
        jump();
    }
}

document.addEventListener('keydown', handleJump);
gameArea.addEventListener('mousedown', handleJump);
gameArea.addEventListener('touchstart', (e) => { e.preventDefault(); handleJump(e); });


// --- توابع اصلی بازی ---

function startGame() {
    // توقف لوپ قبلی اگر وجود داشته باشد
    if (animationId) cancelAnimationFrame(animationId);

    isGameRunning = true;
    score = 0;
    gameSpeed = 6;
    radBottom = 50;
    velocity = 0;
    
    // مخفی کردن صفحه باخت
    gameOverScreen.classList.add('hidden-screen');
    gameOverScreen.classList.remove('active-screen');
    
    // پاکسازی کامل محیط بازی
    clearGameObjects();
    
    // ریست قدرت‌ها
    deactivatePower('magnet');
    deactivatePower('ghost');
    setCtrlZ(false);
    
    // تنظیم اولیه راد
    rad.style.bottom = radBottom + 'px';
    scoreVal.innerText = '0';

    // شروع لوپ
    gameLoop();
}

function clearGameObjects() {
    // حذف المنت‌ها از HTML
    obstacles.forEach(o => o.element.remove());
    keyframes.forEach(k => k.element.remove());
    powerups.forEach(p => p.element.remove());
    
    // خالی کردن آرایه‌ها
    obstacles = [];
    keyframes = [];
    powerups = [];
}

function gameLoop() {
    if (!isGameRunning) return;

    // 1. فیزیک (جاذبه)
    velocity -= gravity;
    radBottom += velocity;
    
    // برخورد با زمین
    if (radBottom <= 50) { 
        radBottom = 50;
        velocity = 0;
    }
    rad.style.bottom = radBottom + 'px';

    // 2. مدیریت تولید (Spawn)
    handleSpawning();

    // 3. حرکت و برخورد (Logic اصلی)
    moveAndCheckCollision();

    // 4. افزایش سختی بازی
    gameSpeed += 0.002; 

    // ادامه لوپ
    animationId = requestAnimationFrame(gameLoop);
}

function jump() {
    // پرش فقط وقتی نزدیک زمین هستیم (تشخیص برخورد با زمین)
    if (radBottom <= 60) { 
        velocity = 15; // قدرت پرش
    }
}

// --- بخش تولید (Spawning) ---
let spawnTimer = 0;
function handleSpawning() {
    spawnTimer++;
    // هرچقدر سرعت بیشتر شود، فاصله تولید کمتر می‌شود (تا یک حد خاص)
    const spawnThreshold = 110 - Math.min(gameSpeed * 2, 70);
    
    if (spawnTimer > spawnThreshold) {
        spawnTimer = 0;
        const rand = Math.random();

        // شانس‌ها:
        // 10% پاورآپ
        // 40% کی‌فریم (سکه)
        // 50% مانع
        if (rand > 0.90) createPowerUp();
        else if (rand > 0.5) createKeyframe();
        else createObstacle();
    }
}

function createObstacle() {
    const el = document.createElement('div');
    el.classList.add('obstacle');
    el.style.left = '1000px'; // شروع از بیرون کادر
    // تنوع ارتفاع
    if(Math.random() > 0.6) el.style.height = '90px'; 
    
    gameArea.appendChild(el);
    obstacles.push({ element: el, x: 1000 });
}

function createKeyframe() {
    const el = document.createElement('div');
    el.classList.add('keyframe');
    el.style.left = '1000px';
    const y = Math.random() * 150 + 70; // ارتفاع تصادفی
    el.style.bottom = y + 'px';
    
    gameArea.appendChild(el);
    keyframes.push({ element: el, x: 1000, y: y });
}

function createPowerUp() {
    const r = Math.random();
    let type = 'ctrlz'; 
    // شانس پاورآپ‌ها: 40% CtrlZ, 30% Magnet, 30% Ghost
    if (r > 0.7) type = 'magnet';
    else if (r > 0.4) type = 'ghost';

    const el = document.createElement('div');
    el.classList.add('powerup-item');
    
    if(type === 'ctrlz') { el.classList.add('p-ctrlz'); el.innerText = '↩'; }
    else if(type === 'magnet') { el.classList.add('p-magnet'); el.innerText = '🧲'; }
    else { el.classList.add('p-ghost'); el.innerText = '👻'; }
    
    el.style.left = '1000px';
    el.style.bottom = (Math.random() * 100 + 60) + 'px';
    
    gameArea.appendChild(el);
    powerups.push({ element: el, x: 1000, type: type });
}

// --- حرکت و مدیریت برخورد ---
function moveAndCheckCollision() {
    
    // 1. موانع (استفاده از حلقه معکوس برای حذف امن)
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;
        obs.element.style.left = obs.x + 'px';

        // بررسی برخورد
        if (checkRectCollision(rad, obs.element)) {
            if (ghostActive) {
                // عبور روح
                obs.element.style.opacity = '0.3';
            } else if (hasCtrlZ) {
                // استفاده از جان اضافه
                useCtrlZ();
                // حذف مانع
                obs.element.remove();
                obstacles.splice(i, 1);
            } else {
                gameOver();
                return; // توقف فوری تابع
            }
        }
        // حذف اگر از صفحه خارج شد
        else if (obs.x < -60) {
            obs.element.remove();
            obstacles.splice(i, 1);
        }
    }

    // 2. کی‌فریم‌ها (سکه)
    for (let i = keyframes.length - 1; i >= 0; i--) {
        let kf = keyframes[i];
        
        // منطق آهنربا
        if (magnetActive && kf.x < 400 && kf.x > -50) {
            const dx = radLeft - kf.x;
            const dy = radBottom - kf.y;
            kf.x += dx * 0.15;
            kf.y += dy * 0.15;
            kf.element.style.bottom = kf.y + 'px';
        } else {
            kf.x -= gameSpeed;
        }
        kf.element.style.left = kf.x + 'px';

        if (checkRectCollision(rad, kf.element)) {
            score++;
            scoreVal.innerText = score;
            kf.element.remove();
            keyframes.splice(i, 1);
        } else if (kf.x < -50) {
            kf.element.remove();
            keyframes.splice(i, 1);
        }
    }

    // 3. پاورآپ‌ها
    for (let i = powerups.length - 1; i >= 0; i--) {
        let pu = powerups[i];
        pu.x -= gameSpeed;
        pu.element.style.left = pu.x + 'px';

        if (checkRectCollision(rad, pu.element)) {
            activatePower(pu.type);
            pu.element.remove();
            powerups.splice(i, 1);
        } else if (pu.x < -50) {
            pu.element.remove();
            powerups.splice(i, 1);
        }
    }
}

// --- سیستم قدرت‌ها ---
function activatePower(type) {
    if (type === 'ctrlz') {
        setCtrlZ(true);
    } else if (type === 'magnet') {
        magnetActive = true;
        rad.classList.add('magnet-mode');
        iconMagnet.classList.remove('hidden');
        clearTimeout(magnetTimer);
        magnetTimer = setTimeout(() => deactivatePower('magnet'), 7000); // 7 ثانیه
    } else if (type === 'ghost') {
        ghostActive = true;
        rad.classList.add('ghost-mode');
        iconGhost.classList.remove('hidden');
        clearTimeout(ghostTimer);
        ghostTimer = setTimeout(() => deactivatePower('ghost'), 5000); // 5 ثانیه
    }
}

function deactivatePower(type) {
    if (type === 'magnet') {
        magnetActive = false;
        rad.classList.remove('magnet-mode');
        iconMagnet.classList.add('hidden');
    } else if (type === 'ghost') {
        ghostActive = false;
        rad.classList.remove('ghost-mode');
        iconGhost.classList.add('hidden');
    }
}

function setCtrlZ(status) {
    hasCtrlZ = status;
    if (status) ctrlZIndicator.classList.remove('hidden');
    else ctrlZIndicator.classList.add('hidden');
}

function useCtrlZ() {
    setCtrlZ(false); // غیرفعال کردن جان
    
    // افکت فلش سبز
    const wrapper = document.querySelector('.game-wrapper');
    wrapper.style.backgroundColor = '#2ecc71';
    setTimeout(() => { wrapper.style.backgroundColor = '#2d2d2d'; }, 150);
}

// --- ابزار کمکی ---
function checkRectCollision(el1, el2) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    const padding = 10; // محدوده امن برای اینکه برخورد خیلی سختگیرانه نباشد
    
    return !(
        r1.top + padding > r2.bottom - padding ||
        r1.right - padding < r2.left + padding ||
        r1.bottom - padding < r2.top + padding ||
        r1.left + padding > r2.right - padding
    );
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(animationId); // توقف کامل انیمیشن
    
    document.getElementById('end-msg').innerHTML = 
        `<span style="color:#3498db">${playerName}</span> عزیز،<br>پروژه در فریم ${score} کرش کرد!`;
    
    gameOverScreen.classList.remove('hidden-screen');
    gameOverScreen.classList.add('active-screen');
}
