const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function dateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function nextDate(key, amount = 1) {
  const [year, month, day] = key.split('-').map(Number);
  const date = utcDate(year, month, day);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function dayOfWeek(year, month, day) {
  return utcDate(year, month, day).getUTCDay();
}

function nthMonday(year, month, nth) {
  const firstMonday = 1 + ((8 - dayOfWeek(year, month, 1)) % 7);
  return firstMonday + (nth - 1) * 7;
}

// 1980～2099年向けの近似式。官報公表前の将来年だけに使用する。
function vernalEquinoxDay(year) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinoxDay(year) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function add(map, year, month, day, name) {
  map.set(dateKey(year, month, day), name);
}

function calculatedNationalHolidays(year) {
  const result = new Map();
  add(result, year, 1, 1, '元日');
  add(result, year, 1, nthMonday(year, 1, 2), '成人の日');
  add(result, year, 2, 11, '建国記念の日');
  add(result, year, 2, 23, '天皇誕生日');
  add(result, year, 3, vernalEquinoxDay(year), '春分の日');
  add(result, year, 4, 29, '昭和の日');
  add(result, year, 5, 3, '憲法記念日');
  add(result, year, 5, 4, 'みどりの日');
  add(result, year, 5, 5, 'こどもの日');
  add(result, year, 7, nthMonday(year, 7, 3), '海の日');
  add(result, year, 8, 11, '山の日');
  add(result, year, 9, nthMonday(year, 9, 3), '敬老の日');
  add(result, year, 9, autumnalEquinoxDay(year), '秋分の日');
  add(result, year, 10, nthMonday(year, 10, 2), 'スポーツの日');
  add(result, year, 11, 3, '文化の日');
  add(result, year, 11, 23, '勤労感謝の日');
  return result;
}

function addCitizenHolidays(map, year) {
  const start = utcDate(year, 1, 2);
  const end = utcDate(year, 12, 30);
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const date = new Date(time);
    const key = dateKey(year, date.getUTCMonth() + 1, date.getUTCDate());
    if (!map.has(key) && map.has(nextDate(key, -1)) && map.has(nextDate(key, 1))) {
      map.set(key, '国民の休日');
    }
  }
}

function addSubstituteHolidays(map) {
  const national = [...map.keys()];
  for (const key of national) {
    const [year, month, day] = key.split('-').map(Number);
    if (dayOfWeek(year, month, day) !== 0) continue;
    let substitute = nextDate(key);
    while (map.has(substitute)) substitute = nextDate(substitute);
    map.set(substitute, '振替休日');
  }
}

function normalizeOfficialName(key, name, official) {
  if (name !== '休日') return name;
  const previous = official[nextDate(key, -1)];
  const following = official[nextDate(key, 1)];
  return previous && following && previous !== '休日' && following !== '休日'
    ? '国民の休日'
    : '振替休日';
}

export function createHolidayCalendar(officialData) {
  const official = officialData?.holidays ?? {};
  const firstYear = Number(officialData?.firstYear) || 0;
  const lastYear = Number(officialData?.lastYear) || 0;
  const cache = new Map();

  function yearCalendar(year) {
    if (cache.has(year)) return cache.get(year);
    const result = new Map();
    if (year >= firstYear && year <= lastYear) {
      for (const [key, name] of Object.entries(official)) {
        if (Number(key.slice(0, 4)) === year) result.set(key, normalizeOfficialName(key, name, official));
      }
    } else if (year >= 1980 && year <= 2099) {
      for (const [key, name] of calculatedNationalHolidays(year)) result.set(key, name);
      addCitizenHolidays(result, year);
      addSubstituteHolidays(result);
    }
    cache.set(year, result);
    return result;
  }

  return {
    get(year, month, day) {
      return yearCalendar(year).get(dateKey(year, month, day)) ?? null;
    },
    forYear(year) {
      return new Map(yearCalendar(year));
    },
  };
}
