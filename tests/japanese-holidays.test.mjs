import test from 'node:test';
import assert from 'node:assert/strict';
import holidayData from '../src/holidays.json' with { type: 'json' };
import { createHolidayCalendar } from '../src/japanese-holidays.js';

const holidays = createHolidayCalendar(holidayData);

test('2026年の内閣府公表済み休日を判定する', () => {
  assert.equal(holidays.get(2026, 5, 6), '振替休日');
  assert.equal(holidays.get(2026, 9, 22), '国民の休日');
  assert.equal(holidays.get(2026, 9, 23), '秋分の日');
});

test('2027年の振替休日を判定する', () => {
  assert.equal(holidays.get(2027, 3, 21), '春分の日');
  assert.equal(holidays.get(2027, 3, 22), '振替休日');
});

test('五輪特例の2020年・2021年を公式データから判定する', () => {
  assert.equal(holidays.get(2020, 7, 23), '海の日');
  assert.equal(holidays.get(2020, 7, 24), 'スポーツの日');
  assert.equal(holidays.get(2021, 8, 8), '山の日');
  assert.equal(holidays.get(2021, 8, 9), '振替休日');
});

test('公表範囲後は固定・曜日ルールで暫定計算する', () => {
  assert.equal(holidays.get(2028, 1, 1), '元日');
  assert.equal(holidays.get(2028, 1, 10), '成人の日');
  assert.equal(holidays.get(2028, 7, 17), '海の日');
});

test('平日は祝日として誤判定しない', () => {
  assert.equal(holidays.get(2026, 6, 10), null);
});
