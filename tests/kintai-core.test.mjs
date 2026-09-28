import test from 'node:test';
import assert from 'node:assert/strict';
import { durationMinutes, workHours } from '../src/kintai-core.js';

const day = (in1, out1, breakH, extra = {}) => ({
  off: false, in1, out1, in2: '', out2: '', breakH, ...extra,
});

test('9:00〜22:00、休憩1時間は12時間', () => {
  assert.equal(workHours(day('09:00', '22:00', '1')), 12);
});

test('10:00〜21:00、休憩2時間は9時間', () => {
  assert.equal(workHours(day('10:00', '21:00', '2')), 9);
});

test('分割勤務を合計する', () => {
  assert.equal(workHours(day('09:00', '12:00', '0.5', { in2: '13:00', out2: '18:00' })), 7.5);
});

test('日跨ぎ勤務に対応する', () => {
  assert.equal(workHours(day('19:00', '01:00', '0.5')), 5.5);
  assert.equal(durationMinutes('23:30', '00:30'), 60);
});

test('休みと入力不足は0時間', () => {
  assert.equal(workHours({ ...day('09:00', '18:00', '1'), off: true }), 0);
  assert.equal(workHours(day('09:00', '', '1')), 0);
});
