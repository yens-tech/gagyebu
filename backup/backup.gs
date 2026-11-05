/**
 * 우리 가계부 → 구글 시트 자동 백업
 * 매일 새벽 3시에 Firebase의 가계부 내역을 구글 드라이브의 "우리 가계부 백업" 시트로 복사합니다.
 * 시트는 구글 드라이브 '버전 기록'에 날짜별로 남기 때문에 예전 상태로 되돌릴 수도 있어요.
 *
 * 처음 한 번: 위 메뉴에서 함수 'setup' 선택 → ▶ 실행 → 권한 허용
 */
const PROJECT_ID = 'our-gagyebu-82fa6';
const HOUSEHOLD  = 'our-home';
const SHEET_NAME = '우리 가계부 백업';
const CATS = {"food": "식비", "cafe": "카페·간식", "delivery": "배달", "mart": "생필품", "conv": "편의점", "transport": "교통", "car": "차량·주유", "housing": "주거비", "utility": "공과금", "telecom": "통신", "subs": "구독", "loan": "대출이자", "insurance": "보험", "health": "병원·약", "beauty": "미용", "fashion": "패션", "culture": "문화", "play": "오락", "hobby": "취미", "travel": "여행", "date": "데이트", "alcohol": "술·모임", "edu": "교육", "dues": "회비", "gift": "경조사·선물", "pet": "반려동물", "etc": "기타", "salary": "월급", "bonus": "보너스", "side": "부수입", "allowance": "용돈", "interest": "이자·배당", "refund": "환급", "etc_in": "기타"};

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backup').timeBased().everyDays(1).atHour(3).create();
  backup();
  Logger.log('설정 완료: 매일 새벽 3시에 자동 백업합니다. 시트 주소: ' + getBook().getUrl());
}

function backup() {
  const root = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/households/${HOUSEHOLD}`;
  const home = fetchJson(root);
  const settings = home && home.fields && home.fields.settings ? fromValue(home.fields.settings) : {};
  const names = (settings && settings.names) || { a: '주영', b: '대현' };
  const who = w => w === 'a' ? names.a : w === 'b' ? names.b : '우리';

  const txs = []; let pageToken = '';
  do {
    const j = fetchJson(`${root}/tx?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`);
    (j.documents || []).forEach(d => txs.push(fromFields(d.fields || {})));
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  txs.sort((x, y) => String(x.date).localeCompare(String(y.date)) || (x.createdAt || 0) - (y.createdAt || 0));

  const book = getBook();
  // 1) 전체 내역
  const all = sheet(book, '전체 내역');
  const rows = [['날짜', '구분', '카테고리', '사람', '금액', '메모', '입력한 사람', 'ID']].concat(
    txs.filter(t => !t.ex).map(t => [t.date, t.type === 'in' ? '입금' : '지출', CATS[t.cat] || t.cat || '기타', who(t.who),
      t.type === 'in' ? Number(t.amount) : -Number(t.amount), t.memo || '', t.by || '', t.id]));
  all.clearContents();
  all.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  all.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  all.setFrozenRows(1);
  if (rows.length > 1) all.getRange(2, 5, rows.length - 1, 1).setNumberFormat('#,##0');

  // 2) 월별 요약
  const sum = {};
  txs.filter(t => !t.ex).forEach(t => { const m = String(t.date).slice(0, 7); sum[m] = sum[m] || { in: 0, out: 0 }; sum[m][t.type === 'in' ? 'in' : 'out'] += Number(t.amount) || 0; });
  const ms = Object.keys(sum).sort();
  const srows = [['월', '수입', '지출', '수입−지출']].concat(ms.map(m => [m, sum[m].in, sum[m].out, sum[m].in - sum[m].out]));
  const s2 = sheet(book, '월별 요약'); s2.clearContents();
  s2.getRange(1, 1, srows.length, 4).setValues(srows); s2.getRange(1, 1, 1, 4).setFontWeight('bold'); s2.setFrozenRows(1);
  if (srows.length > 1) s2.getRange(2, 2, srows.length - 1, 3).setNumberFormat('#,##0');

  // 3) 백업 기록
  const log = sheet(book, '백업 기록');
  if (log.getLastRow() === 0) log.appendRow(['백업 시각', '내역 수']);
  log.appendRow([new Date(), rows.length - 1]);
}

/* ---------- 도우미 ---------- */
function fetchJson(url) {
  const r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT_ID }, muteHttpExceptions: true });
  if (r.getResponseCode() === 404) return {};
  if (r.getResponseCode() !== 200) throw new Error('Firebase 읽기 실패 ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText());
}
function getBook() {
  const p = PropertiesService.getScriptProperties(); const id = p.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const b = SpreadsheetApp.create(SHEET_NAME); p.setProperty('SHEET_ID', b.getId()); return b;
}
function sheet(book, name) {
  let sh = book.getSheetByName(name);
  if (!sh) { sh = book.insertSheet(name); const d = book.getSheetByName('시트1') || book.getSheetByName('Sheet1'); if (d && book.getSheets().length > 1) book.deleteSheet(d); }
  return sh;
}
function fromFields(f) { const o = {}; Object.keys(f).forEach(k => o[k] = fromValue(f[k])); return o; }
function fromValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return null;
}
