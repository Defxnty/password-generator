// Наборы символов
const charSets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    similarChars: 'il1Lo0O'
};

// История паролей
let passwordHistory = JSON.parse(localStorage.getItem('passwordHistory')) || [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateHistoryDisplay();
    generatePassword();
});

// Обновление отображения длины
function updateLength(value) {
    const lengthValue = document.getElementById('lengthValue');
    lengthValue.textContent = value;
    lengthValue.classList.add('scale-110');
    setTimeout(() => lengthValue.classList.remove('scale-110'), 150);
    generatePassword();
}

// Генерация пароля
function generatePassword() {
    const length = parseInt(document.getElementById('lengthSlider').value);
    const useUppercase = document.getElementById('uppercase').checked;
    const useLowercase = document.getElementById('lowercase').checked;
    const useNumbers = document.getElementById('numbers').checked;
    const useSymbols = document.getElementById('symbols').checked;
    const excludeSimilar = document.getElementById('excludeSimilar').checked;

    // Формирование пула символов
    let chars = '';
    let requiredChars = [];

    if (useUppercase) {
        let uppercaseSet = charSets.uppercase;
        if (excludeSimilar) uppercaseSet = removeChars(uppercaseSet, charSets.similarChars);
        chars += uppercaseSet;
        if (uppercaseSet.length > 0) requiredChars.push(getRandomChar(uppercaseSet));
    }
    if (useLowercase) {
        let lowercaseSet = charSets.lowercase;
        if (excludeSimilar) lowercaseSet = removeChars(lowercaseSet, charSets.similarChars);
        chars += lowercaseSet;
        if (lowercaseSet.length > 0) requiredChars.push(getRandomChar(lowercaseSet));
    }
    if (useNumbers) {
        let numbersSet = charSets.numbers;
        if (excludeSimilar) numbersSet = removeChars(numbersSet, charSets.similarChars);
        chars += numbersSet;
        if (numbersSet.length > 0) requiredChars.push(getRandomChar(numbersSet));
    }
    if (useSymbols) {
        let symbolsSet = charSets.symbols;
        chars += symbolsSet;
        if (symbolsSet.length > 0) requiredChars.push(getRandomChar(symbolsSet));
    }

    // Проверка, что выбран хотя бы один тип символов
    if (chars.length === 0) {
        const display = document.getElementById('passwordDisplay');
        display.innerHTML = '<span class="text-red-400 text-sm whitespace-nowrap">Выберите тип символов!</span>';
        display.parentElement.classList.add('shake');
        setTimeout(() => display.parentElement.classList.remove('shake'), 500);
        updateStrengthIndicator({ score: 0, crackTimeData: { time: '—', icon: 'fa-clock', color: 'text-gray-400' } });
        return;
    }

    // Генерация пароля
    let password = '';
    
    // Сначала добавляем обязательные символы, чтобы каждый выбранный тип был представлен

    requiredChars.forEach(char => {
        password += char;
    });

    // Заполняем оставшуюся часть случайными символами
    for (let i = password.length; i < length; i++) {
        password += getRandomChar(chars);
    }

    // Перемешиваем пароль
    password = shuffleString(password);

    // Отображение пароля с анимацией
    displayPasswordWithAnimation(password);
    
    // Обновление индикатора надёжности
    const strengthData = calculateStrength(password);
    updateStrengthIndicator(strengthData);

    // Добавление в историю паролей
    addToHistory(password);
}

// Получение случайного символа
function getRandomChar(str) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return str[array[0] % str.length];
}

// Удаление символов из строки
function removeChars(str, charsToRemove) {
    return str.split('').filter(char => !charsToRemove.includes(char)).join('');
}

// Перемешивание строки
function shuffleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const j = array[0] % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

// Отображение пароля с анимацией печати
function displayPasswordWithAnimation(password) {
    const display = document.getElementById('passwordDisplay');
    display.innerHTML = '';
    
    password.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'password-char';
        span.style.animationDelay = `${index * 20}ms`;
        
        if (/[A-Z]/.test(char)) {
            span.classList.add('text-purple-400');
        } else if (/[a-z]/.test(char)) {
            span.classList.add('text-green-400');
        } else if (/[0-9]/.test(char)) {
            span.classList.add('text-blue-400');
        } else {
            span.classList.add('text-pink-400');
        }
        
        display.appendChild(span);
    });
}

// Определение размера пула символов на основе состава пароля
function getPoolSize(password) {
    let poolSize = 0;
    
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;
    
    return poolSize;
}

// Проверка распространённых шаблонов, ослабляющих пароль

function checkPatterns(password) {
    let penalties = 0;
    
    // Проверка последовательностей (abc, 123)
    const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const lowerPass = password.toLowerCase();
    
    for (const seq of sequences) {
        for (let i = 0; i <= seq.length - 3; i++) {
            const pattern = seq.substring(i, i + 3);
            if (lowerPass.includes(pattern)) penalties += 10;
            // Проверка обратной последовательности
            const reversePattern = pattern.split('').reverse().join('');
            if (lowerPass.includes(reversePattern)) penalties += 10;
        }
    }
    
    // Проверка повторяющихся символов (aaa, 111)
    if (/(.)\1{2,}/.test(password)) penalties += 15;
    
    // Проверка повторяющихся шаблонов (abab, 1212)
    if (/(.+)\1+/.test(password)) penalties += 10;
    
    return Math.min(penalties, 40); // Cap penalties
}

// Форматирование времени взлома в читаемую строку
function formatCrackTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return { time: 'вечность', icon: 'fa-infinity', color: 'text-cyan-400' };
    
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;
    const century = year * 100;
    const millennium = year * 1000;
    const million_years = year * 1e6;
    const billion_years = year * 1e9;
    const trillion_years = year * 1e12;
    
    // Возраст Вселенной ≈ 13.8 млрд лет
    const universeAge = year * 13.8e9;
    
    let time, icon, color;
    
    if (seconds < 0.001) {
        time = 'мгновенно';
        icon = 'fa-bolt';
        color = 'text-red-500';
    } else if (seconds < 1) {
        time = 'менее секунды';
        icon = 'fa-bolt';
        color = 'text-red-500';
    } else if (seconds < minute) {
        time = `${Math.round(seconds)} сек.`;
        icon = 'fa-stopwatch';
        color = 'text-red-400';
    } else if (seconds < hour) {
        const mins = Math.round(seconds / minute);
        time = `${mins} мин.`;
        icon = 'fa-stopwatch';
        color = 'text-orange-400';
    } else if (seconds < day) {
        const hrs = Math.round(seconds / hour);
        time = `${hrs} ч.`;
        icon = 'fa-clock';
        color = 'text-orange-400';
    } else if (seconds < week) {
        const days = Math.round(seconds / day);
        time = `${days} ${pluralize(days, 'день', 'дня', 'дней')}`;
        icon = 'fa-calendar-day';
        color = 'text-yellow-400';
    } else if (seconds < month) {
        const weeks = Math.round(seconds / week);
        time = `${weeks} ${pluralize(weeks, 'неделя', 'недели', 'недель')}`;
        icon = 'fa-calendar-week';
        color = 'text-yellow-400';
    } else if (seconds < year) {
        const months = Math.round(seconds / month);
        time = `${months} ${pluralize(months, 'месяц', 'месяца', 'месяцев')}`;
        icon = 'fa-calendar';
        color = 'text-yellow-300';
    } else if (seconds < century) {
        const years = Math.round(seconds / year);
        time = `${years} ${pluralize(years, 'год', 'года', 'лет')}`;
        icon = 'fa-calendar-alt';
        color = 'text-green-400';
    } else if (seconds < millennium) {
        const centuries = Math.round(seconds / century);
        time = `${centuries} ${pluralize(centuries, 'век', 'века', 'веков')}`;
        icon = 'fa-hourglass-half';
        color = 'text-green-400';
    } else if (seconds < million_years) {
        const millennia = Math.round(seconds / millennium);
        time = `${millennia.toLocaleString()} тыс. лет`;
        icon = 'fa-mountain';
        color = 'text-emerald-400';
    } else if (seconds < billion_years) {
        const millions = Math.round(seconds / million_years);
        time = `${millions.toLocaleString()} млн лет`;
        icon = 'fa-globe';
        color = 'text-cyan-400';
    } else if (seconds < trillion_years) {
        const billions = Math.round(seconds / billion_years);
        time = `${billions.toLocaleString()} млрд лет`;
        icon = 'fa-sun';
        color = 'text-cyan-400';
    } else if (seconds < universeAge * 1000) {
        const trillions = Math.round(seconds / trillion_years);
        time = `${trillions.toLocaleString()} трлн лет`;
        icon = 'fa-star';
        color = 'text-blue-400';
    } else {
        time = 'практически невозможно';
        icon = 'fa-infinity';
        color = 'text-purple-400';
    }
    
    return { time, icon, color };
}

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

// Расчёт надёжности пароля на основе времени взлома
function calculateStrength(password) {
    if (password.length === 0) return { score: 0, crackTimeData: { time: '—', icon: 'fa-clock', color: 'text-gray-400' }, secondsToCrack: 0 };
    
    const poolSize = getPoolSize(password);
    if (poolSize === 0) return { score: 0, crackTimeData: { time: '—', icon: 'fa-clock', color: 'text-gray-400' }, secondsToCrack: 0 };
    
    // Расчёт базового количества комбинаций
    let combinations = Math.pow(poolSize, password.length);
    
    // Применение штрафов за шаблон (уменьшаем эффективное число комбинаций)
    const patternPenalty = checkPatterns(password);
    if (patternPenalty > 0) {
        combinations = combinations / Math.pow(2, patternPenalty / 5);
    }
    
    // Штраф за низкую уникальность символов
    const uniqueChars = new Set(password).size;
    const uniqueRatio = uniqueChars / password.length;
    if (uniqueRatio < 0.5) {
        combinations = combinations / 10;
    } else if (uniqueRatio < 0.7) {
        combinations = combinations / 3;
    }
    
    // Скорость атаки: 100 млрд попыток в секунду (кластер из 8× RTX 4090, быстрый хеш)
    const guessesPerSecond = 100e9;
    
    // Средний случай: требуется перебрать половину всех комбинаций
    const secondsToCrack = Math.max(0, combinations / guessesPerSecond / 2);
    
    // Получение форматированного времени взлома
    const crackTimeData = formatCrackTime(secondsToCrack);
    
    // Оценка основывается НАПРЯМУЮ на времени взлома
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;
    const century = year * 100;
    
    let score;
    if (secondsToCrack < 1) {
        score = 0; // Мгновенно
    } else if (secondsToCrack < minute) {
        score = 1; // Секунды
    } else if (secondsToCrack < hour) {
        score = 2; // Минуты
    } else if (secondsToCrack < day) {
        score = 3; // Часы
    } else if (secondsToCrack < week) {
        score = 4; // Дни
    } else if (secondsToCrack < month) {
        score = 5; // Недели
    } else if (secondsToCrack < year) {
        score = 6; // Месяцы
    } else if (secondsToCrack < year * 100) {
        score = 7; // Годы
    } else if (secondsToCrack < year * 10000) {
        score = 8; // Века
    } else if (secondsToCrack < year * 1e9) {
        score = 9; // Тысячелетия - миллионы лет
    } else {
        score = 10; // Миллиарды лет и больше
    }
    
    return { 
        score, 
        crackTimeData,
        secondsToCrack
    };
}

// Обновление индикатора надёжности
function updateStrengthIndicator(strengthData) {
    const bar = document.getElementById('strengthBar');
    const text = document.getElementById('strengthText');
    const crackTime = document.getElementById('crackTime');
    
    const { score, crackTimeData } = strengthData;
    
    const percentage = score * 10;
    bar.style.width = `${percentage}%`;
    
    // Обновление времени взлома с иконкой и цветом
    crackTime.innerHTML = `<i class="fas ${crackTimeData.icon} mr-1"></i>Время взлома: <span class="${crackTimeData.color} font-semibold">${crackTimeData.time}</span>`;
    
    // Удаление всех классов уровней надёжности
    bar.classList.remove(
        'strength-critical', 'strength-very-weak', 'strength-weak', 
        'strength-poor', 'strength-fair', 'strength-moderate',
        'strength-good', 'strength-strong', 'strength-great', 
        'strength-superb', 'strength-excellent'
    );
    
    // Каждый уровень = 1 деление (10%)
    // 0: Критический (мгновенно)
    // 1: Очень слабый (секунды)
    // 2: Слабый (минуты)
    // 3: Ненадёжный (часы)
    // 4: Ниже среднего (дни)
    // 5: Средний (недели)
    // 6: Выше среднего (месяцы)
    // 7: Надёжный (годы)
    // 8: Отличный (века)
    // 9: Превосходный (тысячелетия+)
    // 10: Неприступный (миллиарды лет+)
    
    switch(score) {
        case 0:
            bar.classList.add('strength-critical');
            text.textContent = 'Критический';
            text.className = 'text-sm font-semibold text-red-600';
            break;
        case 1:
            bar.classList.add('strength-very-weak');
            text.textContent = 'Очень слабый';
            text.className = 'text-sm font-semibold text-red-400';
            break;
        case 2:
            bar.classList.add('strength-weak');
            text.textContent = 'Слабый';
            text.className = 'text-sm font-semibold text-orange-500';
            break;
        case 3:
            bar.classList.add('strength-poor');
            text.textContent = 'Ненадёжный';
            text.className = 'text-sm font-semibold text-orange-400';
            break;
        case 4:
            bar.classList.add('strength-fair');
            text.textContent = 'Ниже среднего';
            text.className = 'text-sm font-semibold text-amber-400';
            break;
        case 5:
            bar.classList.add('strength-moderate');
            text.textContent = 'Средний';
            text.className = 'text-sm font-semibold text-yellow-400';
            break;
        case 6:
            bar.classList.add('strength-good');
            text.textContent = 'Выше среднего';
            text.className = 'text-sm font-semibold text-lime-400';
            break;
        case 7:
            bar.classList.add('strength-strong');
            text.textContent = 'Надёжный';
            text.className = 'text-sm font-semibold text-green-400';
            break;
        case 8:
            bar.classList.add('strength-great');
            text.textContent = 'Отличный';
            text.className = 'text-sm font-semibold text-emerald-400';
            break;
        case 9:
            bar.classList.add('strength-superb');
            text.textContent = 'Превосходный';
            text.className = 'text-sm font-semibold text-teal-400';
            break;
        case 10:
        default:
            bar.classList.add('strength-excellent');
            text.textContent = 'Неприступный';
            text.className = 'text-sm font-semibold text-cyan-400';
            break;
    }
}

// Копирование пароля в буфер обмена
async function copyPassword() {
    const display = document.getElementById('passwordDisplay');
    const password = display.textContent;
    
    if (password === 'Нажмите "Генерировать"' || password.includes('Выберите')) {
        return;
    }
    
    try {
        await navigator.clipboard.writeText(password);
        
        // Показ уведомления
        const notification = document.getElementById('copyNotification');
        notification.classList.remove('opacity-0');
        notification.classList.add('opacity-100', '-translate-y-2');
        
        // Анимация кнопки
        const btn = document.getElementById('copyBtn');
        btn.classList.add('copy-success');
        btn.innerHTML = '<i class="fas fa-check text-white"></i>';
        
        setTimeout(() => {
            notification.classList.remove('opacity-100', '-translate-y-2');
            notification.classList.add('opacity-0');
            btn.classList.remove('copy-success');
            btn.innerHTML = '<i class="fas fa-copy text-white"></i>';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Добавление пароля в историю
function addToHistory(password) {
    // Предотвращение дубликатов
    if (passwordHistory[0] === password) return;
    
    passwordHistory.unshift(password);
    
    // Храним только последние 10 паролей
    if (passwordHistory.length > 10) {
        passwordHistory = passwordHistory.slice(0, 10);
    }
    
    // Сохранение в localStorage
    localStorage.setItem('passwordHistory', JSON.stringify(passwordHistory));
    
    updateHistoryDisplay();
}

// Обновление отображения истории
function updateHistoryDisplay() {
    const section = document.getElementById('historySection');
    const list = document.getElementById('historyList');
    
    if (passwordHistory.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    list.innerHTML = '';
    
    passwordHistory.forEach((password, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <code>${escapeHtml(password)}</code>
            <button onclick="copyHistoryItem('${escapeHtml(password)}')" title="Копировать">
                <i class="fas fa-copy"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

// Копирование элемента из истории
async function copyHistoryItem(password) {
    try {
        await navigator.clipboard.writeText(password);
        
        const notification = document.getElementById('copyNotification');
        notification.classList.remove('opacity-0');
        notification.classList.add('opacity-100', '-translate-y-2');
        
        setTimeout(() => {
            notification.classList.remove('opacity-100', '-translate-y-2');
            notification.classList.add('opacity-0');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Очистка истории
function clearHistory() {
    passwordHistory = [];
    localStorage.removeItem('passwordHistory');
    updateHistoryDisplay();
}

// Экранирование HTML для предотвращения XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + G — сгенерировать пароль
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        generatePassword();
    }
    // Ctrl/Cmd + C — скопировать (если не в поле ввода)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        copyPassword();
    }
});
