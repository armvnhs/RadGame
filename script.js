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
const factBubble = document.getElementById('fact-bubble');

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
let radLeft = 60; // موقعیت ثابت افقی راد
let animationId;

// آرایه‌ها
let obstacles = [];
let keyframes = [];
let powerups = [];

// وضعیت پاور-آپ‌ها
let hasCtrlZ = false;
let magnetActive = false;
let ghostActive = false;
let magnetTimer, ghostTimer;

// وضعیت فکت‌ها
let fact10Triggered = false;
let fact20Triggered = false;
let factTimeout;

// --- رویدادها (Event Listeners) ---

// 1. دکمه شروع
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

// 3. هندلینگ پرش (اصلاح شده برای موس)
function handleInput(e) {
    // اگر روی دکمه یا اینپوت کلیک شده، پرش نکن
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

    // تشخیص کلید Space
    if (e.type === 'keydown') {
        if (e.code !== 'Space') return;
        e.preventDefault(); // جلوگیری از اسکرول
    }

    // اگر بازی تمام شده و کاربر کلیک/اسپیس زد -> ریستارت
    if (!isGameRunning && !gameOverScreen.classList.contains('hidden-screen')) {
        startGame();
        return;
    }

    // انجام پرش
    if (isGameRunning) {
        jump();
    }
}

// شنونده‌ها روی کل داکیومنت برای اطمینان از عملکرد موس
document.addEventListener('keydown', handleInput);
document.addEventListener('mousedown', handleInput); // کلیک چپ موس
document.addEventListener('touchstart', (e) => { 
    // جلوگیری از زوم یا رفتارهای پیشفرض موبایل
    if(e.target.tagName !== 'BUTTON') e.preventDefault(); 
    handleInput(e); 
}, { passive: false });


// --- توابع اصلی بازی ---

function startGame() {
    if (animationId) cancelAnimationFrame(animationId);

    isGameRunning = true;
    score = 0;
    gameSpeed = 6;
    radBottom = 50;
    velocity = 0;
    
    // ریست فکت‌ها
    fact10Triggered = false;
    fact20Triggered = false;
    hideFact();

    gameOverScreen.classList.add('hidden-screen');
    gameOverScreen.classList.remove('active-screen');

    clearGameObjects();

    deactivatePower('magnet');
    deactivatePower('ghost');
    setCtrlZ(false);

    rad.style.bottom = radBottom + 'px';
    scoreVal.innerText = '0';

    gameLoop();
}

function clearGameObjects() {
    obstacles.forEach(o => o.element.remove());
    keyframes.forEach(k => k.element.remove());
    powerups.forEach(p => p.element.remove());
    obstacles = [];
    keyframes = [];
    powerups = [];
}

function gameLoop() {
    if (!isGameRunning) return;

    // فیزیک
    velocity -= gravity;
    radBottom += velocity;

    // برخورد با کف زمین
    if (radBottom <= 50) {
        radBottom = 50;
        velocity = 0;
    }
    rad.style.bottom = radBottom + 'px';

    handleSpawning();
    moveAndCheckCollision();
    
    // افزایش سرعت
    gameSpeed += 0.002;

    animationId = requestAnimationFrame(gameLoop);
}

function jump() {
    if (radBottom <= 60) {
        velocity = 15;
    }
}

// --- بخش تولید (Spawning) ---
let spawnTimer = 0;
function handleSpawning() {
    spawnTimer++;
    const spawnThreshold = 110 - Math.min(gameSpeed * 2, 70);

    if (spawnTimer > spawnThreshold) {
        spawnTimer = 0;
        const rand = Math.random();

        if (rand > 0.90) createPowerUp();
        else if (rand > 0.5) createKeyframe();
        else createObstacle();
    }
}

function createObstacle() {
    const el = document.createElement('div');
    el.classList.add('obstacle');
    el.style.left = '1000px';
    if(Math.random() > 0.6) el.style.height = '90px';
    gameArea.appendChild(el);
    obstacles.push({ element: el, x: 1000 });
}

function createKeyframe() {
    const el = document.createElement('div');
    el.classList.add('keyframe');
    el.style.left = '1000px';
    const y = Math.random() * 150 + 70;
    el.style.bottom = y + 'px';
    gameArea.appendChild(el);
    // ذخیره x و y برای محاسبات دقیق‌تر
    keyframes.push({ element: el, x: 1000, y: y });
}

function createPowerUp() {
    const r = Math.random();
    let type = 'ctrlz';
    if (r > 0.7) type = 'magnet';
    else if (r > 0.4) type = 'ghost';

    const el = document.createElement('div');
    el.classList.add('powerup-item');

    if(type === 'ctrlz') { el.classList.add('p-ctrlz'); el.innerText = '↩'; }
    else if(type === 'magnet') { el.classList.add('p-magnet'); el.innerText = '🧲'; }
    else { el.classList.add('p-ghost'); el.innerText = '👻'; }

    el.style.left = '1000px';
    // ارتفاع رندوم
    const y = Math.random() * 100 + 60;
    el.style.bottom = y + 'px';
    gameArea.appendChild(el);
    powerups.push({ element: el, x: 1000, y: y, type: type });
}

// --- حرکت و مدیریت برخورد (اصلاح شده) ---
function moveAndCheckCollision() {
    
    // مرکز حدودی کاراکتر "راد" برای محاسبات فاصله
    // راد: عرض 40، ارتفاع 40. مرکز X حدود 60+20=80. مرکز Y متغیر.
    const radCenterX = radLeft + 20; 
    const radCenterY = radBottom + 20;

    // 1. موانع (مربع قرمز) - همچنان از برخورد مستطیلی استفاده می‌کنیم چون دقیق‌تر است برای باکس
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;
        obs.element.style.left = obs.x + 'px';

        if (checkRectCollision(rad, obs.element)) {
            if (ghostActive) {
                obs.element.style.opacity = '0.3';
            } else if (hasCtrlZ) {
                useCtrlZ();
                obs.element.remove();
                obstacles.splice(i, 1);
            } else {
                gameOver();
                return;
            }
        } else if (obs.x < -60) {
            obs.element.remove();
            obstacles.splice(i, 1);
        }
    }

    // 2. کی‌فریم‌ها (سکه) - استفاده از فاصله (Distance) برای نرمی بیشتر
    for (let i = keyframes.length - 1; i >= 0; i--) {
        let kf = keyframes[i];
        
        // منطق آهنربا
        if (magnetActive && kf.x < radLeft + 400 && kf.x > -50) {
            kf.y += (radBottom + 20 - kf.y) * 0.15; // جذب سریعتر در محور Y
            kf.x -= (gameSpeed + 8); // حرکت سریع به سمت چپ (به سمت بازیکن)
        } else {
            kf.x -= gameSpeed;
        }
        
        kf.element.style.left = kf.x + 'px';
        kf.element.style.bottom = kf.y + 'px';

        // مرکز سکه (عرض 20 -> نصف 10)
        const kfCenterX = kf.x + 10;
        const kfCenterY = kf.y + 10;

        // محاسبه فاصله
        const dx = radCenterX - kfCenterX;
        const dy = radCenterY - kfCenterY;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // اگر فاصله کمتر از 50 پیکسل بود (شعاع جذب)، سکه خورده شده
        if (distance < 50) {
            score += 2;
            scoreVal.innerText = score;
            checkFactTriggers(score);
            
            kf.element.remove();
            keyframes.splice(i, 1);
        } else if (kf.x < -50) {
            kf.element.remove();
            keyframes.splice(i, 1);
        }
    }

    // 3. پاورآپ‌ها - استفاده از فاصله
    for (let i = powerups.length - 1; i >= 0; i--) {
        let pu = powerups[i];
        pu.x -= gameSpeed;
        pu.element.style.left = pu.x + 'px';

        // مرکز پاورآپ (عرض 32 -> نصف 16)
        const puCenterX = pu.x + 16;
        // پاورآپ موقعیت y ذخیره شده ندارد، از استایل می‌گیریم یا اضافه می‌کنیم
        // (در createPowerUp مقدار y را اضافه کردم به آبجکت)
        const puCenterY = pu.y + 16;

        const dx = radCenterX - puCenterX;
        const dy = radCenterY - puCenterY;
        const distance = Math.sqrt(dx*dx + dy*dy);

        if (distance < 50) { // شعاع جذب پاورآپ
            activatePower(pu.type);
            pu.element.remove();
            powerups.splice(i, 1);
        } else if (pu.x < -50) {
            pu.element.remove();
            powerups.splice(i, 1);
        }
    }
}

// --- سیستم فکت‌ها ---
function checkFactTriggers(currentScore) {
    if (currentScore >= 10 && !fact10Triggered) {
        showFact("راد و رادین همیشه اشتباه گرفته میشند");
        fact10Triggered = true;
    } 
    else if (currentScore >= 20 && !fact20Triggered) {
        showFact("ابراهیم هیچوقت نمی‌خوابه");
        fact20Triggered = true;
    }
}

function showFact(text) {
    factBubble.innerText = "فکت : " + text;
    factBubble.classList.remove('hidden');
    factBubble.style.animation = 'none';
    factBubble.offsetHeight; 
    factBubble.style.animation = 'slideDownFade 0.5s forwards';

    if (factTimeout) clearTimeout(factTimeout);
    factTimeout = setTimeout(() => {
        hideFact();
    }, 5000);
}

function hideFact() {
    factBubble.classList.add('hidden');
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
        magnetTimer = setTimeout(() => deactivatePower('magnet'), 7000);
    } else if (type === 'ghost') {
        ghostActive = true;
        rad.classList.add('ghost-mode');
        iconGhost.classList.remove('hidden');
        clearTimeout(ghostTimer);
        ghostTimer = setTimeout(() => deactivatePower('ghost'), 5000);
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
    setCtrlZ(false);
    const wrapper = document.querySelector('.game-wrapper');
    wrapper.style.backgroundColor = '#2ecc71';
    setTimeout(() => { wrapper.style.backgroundColor = '#2d2d2d'; }, 150);
}

// برخورد مستطیلی (فقط برای موانع خطرناک نگه داشته شد)
function checkRectCollision(el1, el2) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    const padding = 12; // کمی فاصله امن
    return !(
        r1.top + padding > r2.bottom - padding ||
        r1.right - padding < r2.left + padding ||
        r1.bottom - padding < r2.top + padding ||
        r1.left + padding > r2.right - padding
    );
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('end-msg').innerHTML =
        `<span style="color:#3498db">${playerName}</span>, Project crashed at frame ${score}`;
        
    gameOverScreen.classList.remove('hidden-screen');
    gameOverScreen.classList.add('active-screen');
}
