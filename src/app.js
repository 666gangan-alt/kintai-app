import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { workHours, formatHours as fmtHours } from './kintai-core.js';
import holidayData from './holidays.json';
import { createHolidayCalendar } from './japanese-holidays.js';

const $ = selector => document.querySelector(selector);
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const holidays = createHolidayCalendar(holidayData);
const inputRows = $('#inputRows');
const summaryRows = $('#summaryRows');
const employeeName = $('#employeeName');
const targetMonth = $('#targetMonth');
const memo = $('#memo');
const editorFields = {
  off: $('#editOff'), in1: $('#editIn1'), out1: $('#editOut1'), in2: $('#editIn2'),
  out2: $('#editOut2'), breakH: $('#editBreak'), meal: $('#editMeal'), detail: $('#editDetail'),
};

let state = emptyState();
let editingDay = null;

function emptyDay() {
  return { off: false, in1: '', out1: '', in2: '', out2: '', breakH: '', meal: '', detail: '' };
}

function emptyState() {
  return { days: {}, others: Array.from({ length: 4 }, () => ({ amount: '', detail: '' })), memo: '' };
}

function normalizeState(raw) {
  return {
    days: raw?.days && typeof raw.days === 'object' ? raw.days : {},
    others: Array.from({ length: 4 }, (_, index) => raw?.others?.[index] || { amount: '', detail: '' }),
    memo: raw?.memo || '',
  };
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthParts(value = targetMonth.value) {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

function daysInMonth() {
  const { year, month } = monthParts();
  return new Date(year, month, 0).getDate();
}

function storageKey(month = targetMonth.value, name = employeeName.value.trim()) {
  return `kintai:v1:${name || '_'}:${month}`;
}

function dayData(day) {
  state.days[day] ||= emptyDay();
  return state.days[day];
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function save(silent = true) {
  state.memo = memo.value;
  localStorage.setItem(storageKey(), JSON.stringify(state));
  localStorage.setItem('kintai:lastName', employeeName.value.trim());
  if (!silent) showToast('保存しました');
}

function load() {
  const raw = localStorage.getItem(storageKey());
  try {
    state = normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    state = emptyState();
    showToast('保存データを読み込めませんでした');
  }
  memo.value = state.memo;
  renderAll();
}

function formatMonth(value = targetMonth.value) {
  const { year, month } = monthParts(value);
  return `${year}年 ${month}月`;
}

function shiftMonth(amount) {
  save();
  const { year, month } = monthParts();
  const shifted = new Date(year, month - 1 + amount, 1);
  targetMonth.value = `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function rowMeta(day) {
  const { year, month } = monthParts();
  const weekday = new Date(year, month - 1, day).getDay();
  const holidayName = holidays.get(year, month, day);
  return { year, month, weekday, holidayName };
}

function valueOrDash(value) {
  return value === '' || value == null ? '-' : value;
}

function rowMarkup(day, editable) {
  const data = dayData(day);
  const { weekday, holidayName } = rowMeta(day);
  const isSunday = weekday === 0;
  const isSaturday = weekday === 6;
  const colorClass = holidayName || isSunday ? 'holiday-color' : isSaturday ? 'sat' : '';
  const classes = ['attendance-row', 'attendance-grid'];
  if (holidayName || isSunday || isSaturday) classes.push('weekend');
  const offCell = editable
    ? `<input type="checkbox" data-off-day="${day}" aria-label="${day}日を休みにする" ${data.off ? 'checked' : ''}>`
    : `<span class="${data.off ? 'off-value' : ''}">${data.off ? '休' : '-'}</span>`;
  const holidayMark = holidayName ? '<small class="holiday-mark">祝</small>' : '';
  const detailLabel = data.detail ? `詳細あり：${escapeHtml(data.detail)}` : '詳細を編集';
  return `<div class="${classes.join(' ')}" role="row" data-day="${day}" tabindex="0" aria-label="${day}日 ${weekdays[weekday]}曜日${holidayName ? ` ${escapeHtml(holidayName)}` : ''}">
    <span class="day ${colorClass}">${day}</span>
    <span class="${colorClass}">${weekdays[weekday]}${holidayMark}</span>
    ${offCell}
    <span>${data.off ? '-' : valueOrDash(data.in1)}</span>
    <span>${data.off ? '-' : valueOrDash(data.out1)}</span>
    <span>${data.off ? '-' : valueOrDash(data.breakH)}</span>
    <span>${data.off ? '-' : fmtHours(workHours(data))}</span>
    <span>${data.meal ? Number(data.meal).toLocaleString() : '-'}</span>
    <span class="detail-cell" title="${detailLabel}" aria-label="${detailLabel}">▣</span>
  </div>`;
}

function renderRows() {
  const max = daysInMonth();
  inputRows.innerHTML = Array.from({ length: max }, (_, index) => rowMarkup(index + 1, true)).join('');
  summaryRows.innerHTML = Array.from({ length: max }, (_, index) => rowMarkup(index + 1, false)).join('');
}

function calculateSummary() {
  let workDays = 0;
  let offDays = 0;
  let hours = 0;
  let breaks = 0;
  let meal = 0;
  for (let day = 1; day <= daysInMonth(); day += 1) {
    const data = dayData(day);
    hours += workHours(data);
    if (data.off) offDays += 1;
    if (!data.off && (data.in1 || data.in2)) workDays += 1;
    if (!data.off) breaks += Number.parseFloat(data.breakH) || 0;
    meal += Number.parseInt(data.meal, 10) || 0;
  }
  return { workDays, offDays, hours, breaks, meal, average: workDays ? hours / workDays : 0 };
}

function renderSummary() {
  const sums = calculateSummary();
  $('#sumHours').textContent = `${fmtHours(sums.hours)} 時間`;
  $('#sumMeal').textContent = `${sums.meal.toLocaleString()} 円`;
  $('#sumDays').textContent = `${sums.workDays} 日`;
  $('#sumOffDays').textContent = `${sums.offDays} 日`;
  $('#sumAverage').textContent = `${fmtHours(sums.average)} 時間`;
  return sums;
}

function renderOthers() {
  const container = $('#otherRows');
  container.innerHTML = state.others.map((row, index) => `<div class="other-row" data-other-index="${index}">
    <input type="number" inputmode="numeric" data-other-key="amount" value="${escapeHtml(row.amount)}" placeholder="金額">
    <input type="text" data-other-key="detail" value="${escapeHtml(row.detail)}" placeholder="詳細">
  </div>`).join('');
}

function renderAll() {
  $('#monthLabel').textContent = formatMonth();
  $('#pdfActionMonth').textContent = formatMonth();
  renderRows();
  renderSummary();
  renderOthers();
}

function setView(name) {
  document.querySelectorAll('.view').forEach(view => {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle('active', active);
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    const active = item.dataset.nav === name;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openEditor(day) {
  editingDay = Number(day);
  const data = dayData(editingDay);
  const { year, month, weekday, holidayName } = rowMeta(editingDay);
  $('#editorDate').textContent = `${year}年${month}月${editingDay}日（${weekdays[weekday]}）`;
  $('#editorHoliday').textContent = holidayName || '';
  for (const [key, field] of Object.entries(editorFields)) field[field.type === 'checkbox' ? 'checked' : 'value'] = data[key];
  updateEditorState();
  $('#editorBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeEditor() {
  $('#editorBackdrop').hidden = true;
  document.body.style.overflow = '';
  editingDay = null;
}

function updateEditorState() {
  if (!editingDay) return;
  const data = dayData(editingDay);
  const disabled = data.off;
  Object.entries(editorFields).forEach(([key, field]) => { if (key !== 'off') field.disabled = disabled; });
  $('#editWorkHours').textContent = `${fmtHours(workHours(data))} 時間`;
}

function updateEditorValue(key, field) {
  if (!editingDay) return;
  dayData(editingDay)[key] = field.type === 'checkbox' ? field.checked : field.value;
  updateEditorState();
  renderRows();
  renderSummary();
  save();
}

function openSettings() {
  renderOthers();
  $('#settingsBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  $('#settingsBackdrop').hidden = true;
  document.body.style.overflow = '';
}

function buildPdfSheet() {
  const { year, month } = monthParts();
  const max = daysInMonth();
  const sums = calculateSummary();
  $('#pdfName').textContent = employeeName.value.trim() || '　';
  $('#pdfYear').textContent = year;
  $('#pdfMonth').textContent = month;
  const body = $('#pdfBody');
  body.innerHTML = '';
  for (let day = 1; day <= 31; day += 1) {
    const valid = day <= max;
    const data = valid ? dayData(day) : emptyDay();
    const weekday = valid ? new Date(year, month - 1, day).getDay() : null;
    const holidayName = valid ? holidays.get(year, month, day) : null;
    const row = document.createElement('tr');
    row.innerHTML = `<td>${valid ? day : ''}</td><td class="${holidayName || weekday === 0 ? 'sun' : weekday === 6 ? 'sat' : ''}">${valid ? (holidayName ? `${weekdays[weekday]}・祝` : weekdays[weekday]) : ''}</td><td>${valid && data.off ? '休' : ''}</td><td>${valid && !data.off ? escapeHtml(data.in1) : ''}</td><td>${valid && !data.off ? escapeHtml(data.out1) : ''}</td><td>${valid && !data.off ? escapeHtml(data.in2) : ''}</td><td>${valid && !data.off ? escapeHtml(data.out2) : ''}</td><td>${valid && !data.off && data.breakH ? escapeHtml(data.breakH) : ''}</td><td>${valid && !data.off && workHours(data) ? fmtHours(workHours(data)) : ''}</td><td>${valid && data.meal ? Number(data.meal).toLocaleString() : ''}</td><td class="detail">${valid ? escapeHtml(data.detail) : ''}</td>`;
    body.appendChild(row);
  }
  $('#pdfSumDays').textContent = `${sums.workDays}日`;
  $('#pdfSumHours').textContent = `${fmtHours(sums.hours)}時間`;
  $('#pdfSumBreak').textContent = `${fmtHours(sums.breaks)}時間`;
  $('#pdfSumMeal').textContent = `${sums.meal.toLocaleString()}円`;
  $('#pdfMemo').textContent = memo.value;
  $('#pdfOthers').innerHTML = state.others.map(row => `<tr><td>${row.amount ? Number(row.amount).toLocaleString() : ''}</td><td>${escapeHtml(row.detail)}</td></tr>`).join('');
}

async function pdfBlob() {
  buildPdfSheet();
  const canvas = await html2canvas($('#pdfSheet'), { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const image = canvas.toDataURL('image/jpeg', 0.94);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const ratio = Math.min(210 / canvas.width, 297 / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  pdf.addImage(image, 'JPEG', (210 - width) / 2, (297 - height) / 2, width, height, undefined, 'FAST');
  return pdf.output('blob');
}

function fileName() {
  const name = (employeeName.value.trim() || '氏名未入力').replace(/[\\/:*?"<>|]/g, '_');
  return `勤怠表_${name}_${targetMonth.value}.pdf`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}

async function writeNativeFile(blob, path, directory) {
  return Filesystem.writeFile({ path, data: await blobToBase64(blob), directory, recursive: true });
}

async function savePdf() {
  try {
    save();
    const blob = await pdfBlob();
    if (Capacitor.isNativePlatform()) await writeNativeFile(blob, `勤怠管理/${fileName()}`, Directory.Documents);
    else downloadBlob(blob, fileName());
    showToast('PDFを保存しました');
  } catch (error) {
    console.error(error);
    showToast('PDFを保存できませんでした');
  }
}

async function sharePdf() {
  try {
    save();
    const blob = await pdfBlob();
    if (Capacitor.isNativePlatform()) {
      const path = `share/${fileName()}`;
      await writeNativeFile(blob, path, Directory.Cache);
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
      await Share.share({ title: '勤怠表', text: `${employeeName.value.trim()} ${targetMonth.value} 勤怠表`, files: [uri], dialogTitle: 'PDFを共有' });
      return;
    }
    const file = new File([blob], fileName(), { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: '勤怠表', files: [file] });
    else { downloadBlob(blob, fileName()); showToast('共有非対応のためPDFを保存しました'); }
  } catch (error) {
    if (error?.name !== 'AbortError') { console.error(error); showToast('共有できませんでした。PDF保存をお試しください。'); }
  }
}

function previewPdf() {
  save();
  buildPdfSheet();
  $('#pdfWrap').classList.add('previewing');
  $('#pdfWrap').setAttribute('aria-hidden', 'false');
}

function closePreview() {
  $('#pdfWrap').classList.remove('previewing');
  $('#pdfWrap').setAttribute('aria-hidden', 'true');
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

async function saveBackup() {
  save();
  const records = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('kintai:v1:')) records[key] = localStorage.getItem(key);
  }
  const payload = { version: 2, employeeName: employeeName.value, targetMonth: targetMonth.value, records, exportedAt: new Date().toISOString() };
  const name = `勤怠バックアップ_${targetMonth.value}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  try {
    if (Capacitor.isNativePlatform()) await writeNativeFile(blob, `勤怠管理/${name}`, Directory.Documents);
    else downloadBlob(blob, name);
    showToast('バックアップを保存しました');
  } catch (error) {
    console.error(error);
    showToast('バックアップを保存できませんでした');
  }
}

async function restoreBackup(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (!payload || typeof payload !== 'object') throw new Error('invalid');
    if (!confirm('バックアップを復元しますか？ 現在の同じ月のデータは上書きされます。')) return;
    if (payload.records && typeof payload.records === 'object') {
      for (const [key, value] of Object.entries(payload.records)) {
        if (key.startsWith('kintai:v1:') && typeof value === 'string') localStorage.setItem(key, value);
      }
    }
    if (payload.employeeName) employeeName.value = payload.employeeName;
    if (payload.targetMonth) targetMonth.value = payload.targetMonth;
    if (payload.state) { state = normalizeState(payload.state); save(); }
    load();
    showToast('バックアップを復元しました');
  } catch {
    showToast('バックアップを読めませんでした');
  }
}

async function configureServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (Capacitor.isNativePlatform()) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (error) {
      console.warn('旧オフラインキャッシュの解除に失敗しました', error);
    }
    return;
  }
  if (location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => setView(item.dataset.nav)));
$('#summaryPdfBtn').addEventListener('click', () => setView('pdf'));
$('#prevMonthBtn').addEventListener('click', () => shiftMonth(-1));
$('#nextMonthBtn').addEventListener('click', () => shiftMonth(1));
$('#monthPickerBtn').addEventListener('click', () => {
  if (targetMonth.showPicker) targetMonth.showPicker();
  else targetMonth.click();
});
targetMonth.addEventListener('change', load);

inputRows.addEventListener('click', event => {
  const checkbox = event.target.closest('[data-off-day]');
  if (checkbox) {
    const data = dayData(checkbox.dataset.offDay);
    data.off = checkbox.checked;
    renderRows(); renderSummary(); save();
    return;
  }
  const row = event.target.closest('[data-day]');
  if (row) openEditor(row.dataset.day);
});
inputRows.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && !event.target.matches('input')) {
    event.preventDefault();
    openEditor(event.target.closest('[data-day]')?.dataset.day);
  }
});
summaryRows.addEventListener('click', event => {
  const row = event.target.closest('[data-day]');
  if (row) { setView('input'); openEditor(row.dataset.day); }
});

Object.entries(editorFields).forEach(([key, field]) => field.addEventListener('input', () => updateEditorValue(key, field)));
$('#editorCloseBtn').addEventListener('click', closeEditor);
$('#editorDoneBtn').addEventListener('click', closeEditor);
$('#editorBackdrop').addEventListener('click', event => { if (event.target === event.currentTarget) closeEditor(); });

$('#settingsBtn').addEventListener('click', openSettings);
$('#settingsCloseBtn').addEventListener('click', closeSettings);
$('#settingsBackdrop').addEventListener('click', event => { if (event.target === event.currentTarget) closeSettings(); });
employeeName.addEventListener('change', () => { localStorage.setItem('kintai:lastName', employeeName.value.trim()); load(); });
memo.addEventListener('input', () => save());
$('#otherRows').addEventListener('input', event => {
  const row = event.target.closest('[data-other-index]');
  const key = event.target.dataset.otherKey;
  if (!row || !key) return;
  state.others[Number(row.dataset.otherIndex)][key] = event.target.value;
  save();
});

$('#copyPrevBtn').addEventListener('click', () => {
  const { year, month } = monthParts();
  const previous = new Date(year, month - 2, 1);
  const previousMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
  const raw = localStorage.getItem(storageKey(previousMonth));
  if (!raw) { showToast('前月データがありません'); return; }
  if (!confirm(`${previousMonth} のデータを現在月へ複製しますか？`)) return;
  state = normalizeState(JSON.parse(raw));
  state.days = { ...state.days };
  memo.value = state.memo;
  renderAll();
  save(false);
});
$('#clearBtn').addEventListener('click', () => {
  if (!confirm(`${targetMonth.value} の入力を初期化しますか？`)) return;
  localStorage.removeItem(storageKey());
  state = emptyState();
  memo.value = '';
  renderAll();
  showToast('初期化しました');
});
$('#backupBtn').addEventListener('click', saveBackup);
$('#restoreInput').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (file) await restoreBackup(file);
  event.target.value = '';
});

$('#previewBtn').addEventListener('click', previewPdf);
$('#pdfBtn').addEventListener('click', savePdf);
$('#shareBtn').addEventListener('click', sharePdf);
$('#previewCloseBtn').addEventListener('click', closePreview);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!$('#editorBackdrop').hidden) closeEditor();
  else if (!$('#settingsBackdrop').hidden) closeSettings();
  else closePreview();
});

targetMonth.value = currentMonth();
employeeName.value = localStorage.getItem('kintai:lastName') || '';
load();
configureServiceWorker();
