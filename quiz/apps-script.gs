// اختبار مستوى إكسل: يستقبل النتائج والتسجيلات ويحفظها في الشيت، ويرسل إيميل تأكيد.
// Deploy ← Manage deployments ← Edit ← New version | Execute as: Me | Who has access: Anyone

const LEVELS = ['مبتدئ','أساسي','متوسط','متقدم','محترف','خبير'];
const CONFIRM_PAGE = 'https://aleisawi.github.io/ibrahimtech-media/quiz/confirm.html';

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
// نص آمن للشيت: يمنع تنفيذ أي معادلة مكتوبة في الخانات
function cell_(v, max) { return "'" + String(v == null ? '' : v).slice(0, max || 120); }
function html_(v) { return String(v == null ? '' : v).replace(/[<>&"]/g, ''); }

function emailHtml_(name, level, url) {
  return '<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;padding:0;background:#0b1220">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:28px 12px"><tr><td align="center">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:Tahoma,Arial,sans-serif;color:#e8eefc;direction:rtl">' +
    '<tr><td style="padding:0 6px 16px;font-size:18px;font-weight:bold">إبراهيم <span style="color:#21C063">تِك</span>' +
      '<span style="float:left;font-size:12px;border:2px solid #21C063;border-radius:8px;padding:2px 8px;color:#e8eefc">Excel إكسل</span></td></tr>' +
    '<tr><td style="background:#0B1F4B;border:3px solid #21C063;border-radius:22px;padding:30px 24px;text-align:center">' +
      '<div style="font-size:15px;color:#9fb0d0;margin-bottom:6px">هلا ' + name + ' 👋</div>' +
      '<div style="font-size:26px;font-weight:bold;line-height:1.4;margin-bottom:10px">باقي ضغطة وحدة</div>' +
      '<div style="font-size:16px;line-height:1.8;color:#e8eefc;margin-bottom:18px">أكّد إيميلك، ويوصلك <b style="color:#7DFAA6">كود خصم خاص 🎁</b><br>أول ما تنزل دورة مستوى «' + level + '».</div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 18px;border-collapse:collapse;direction:ltr;background:#ffffff;border-radius:10px">' +
        '<tr><td colspan="2" style="background:#f3f4f6;color:#374151;font:13px monospace;padding:6px 12px;text-align:left;border-radius:10px 10px 0 0">fx &nbsp;=IF(Confirmed,"🎁")</td></tr>' +
        '<tr><td style="background:#e5e7eb;color:#4b5563;font:bold 12px Arial;padding:10px 10px;border-radius:0 0 0 10px">1</td>' +
        '<td style="color:#15803d;font:bold 18px Tahoma,Arial;padding:10px 26px;border:3px solid #21C063;background:#f0fdf4;border-radius:0 0 10px 0">كود الخصم</td></tr></table>' +
      '<a href="' + url + '" style="display:inline-block;background:#21C063;color:#06121f;font-size:18px;font-weight:bold;text-decoration:none;padding:13px 34px;border-radius:999px">أكّد إيميلي</a>' +
      '<div style="font-size:12px;color:#9fb0d0;margin-top:18px;line-height:1.7">إذا الزر ما اشتغل، انسخ هالرابط في المتصفح:<br><span style="direction:ltr;word-break:break-all;color:#7DFAA6">' + url + '</span></div>' +
    '</td></tr>' +
    '<tr><td style="padding:16px 6px 0;font-size:12px;color:#9fb0d0;line-height:1.8;text-align:center">وصلك الإيميل لأنك سجّلت في اختبار مستوى إكسل. إذا ما سجلت أنت، تجاهله وما بيوصلك شي.<br>' +
      '<a href="https://www.tiktok.com/@ibrahim.tech47" style="color:#7DFAA6;text-decoration:none">@ibrahim.tech47</a></td></tr>' +
  '</table></td></tr></table></body></html>';
}

const LEAD_HEADERS = ['آخر تحديث','أول تسجيل','الاسم','إيميل','المستوى','الصح','عدد الأسئلة','عدد المحاولات','موافقة','إيميل مؤكد','رمز الإيميل','الجلسة'];
const C = {}; LEAD_HEADERS.forEach((h, i) => C[h] = i + 1);

// تبويب المسجلين: لو فيه نسخة قديمة (فيها الواتساب) نغيّر اسمها ونبدأ تبويب جديد
function leads_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('المسجلين');
  if (sh && sh.getLastColumn() > 0 && sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf('واتساب') >= 0) {
    sh.setName('المسجلين القديم ' + Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'));
    sh = null;
  }
  if (!sh) { sh = ss.insertSheet('المسجلين'); sh.appendRow(LEAD_HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function sendConfirm_(email, name, level, token) {
  if (MailApp.getRemainingDailyQuota() <= 5) return;
  MailApp.sendEmail({
    to: email,
    name: 'إبراهيم تِك | إكسل',
    subject: 'باقي ضغطة وحدة ويوصلك كود الخصم 🎁',
    body: 'أكّد إيميلك من هنا: ' + CONFIRM_PAGE + '?t=' + token,
    htmlBody: emailHtml_(html_(name).slice(0, 60), level, CONFIRM_PAGE + '?t=' + token)
  });
}

function doPost(e) {
  const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  const now = new Date();
  const level = LEVELS.indexOf(d.level) >= 0 ? d.level : '';
  if (d.type === 'result') {
    sheet_('النتائج', ['الوقت','الجلسة','الصح','عدد الأسئلة','المستوى','الإجابات','اللغة'])
      .appendRow([now, cell_(d.sid, 20), Number(d.score) || 0, Number(d.asked) || 0, level, cell_(d.answers, 400), cell_(d.ua, 20)]);
    return ContentService.createTextOutput('ok');
  }
  if (d.type !== 'lead') return ContentService.createTextOutput('bad');
  const email = String(d.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^\S+@\S+\.\S+$/.test(email) || !d.consent) return ContentService.createTextOutput('bad');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = leads_();
    const n = sh.getLastRow();
    const emails = n > 1 ? sh.getRange(2, C['إيميل'], n - 1, 1).getValues().map(r => String(r[0]).replace(/^'/, '').toLowerCase()) : [];
    const i = emails.indexOf(email);
    if (i >= 0) {
      // نفس الإيميل: نحدّث لآخر نتيجة
      const r = i + 2;
      const row = sh.getRange(r, 1, 1, LEAD_HEADERS.length).getValues()[0];
      row[C['آخر تحديث'] - 1] = now;
      row[C['الاسم'] - 1] = cell_(d.name, 60);
      row[C['المستوى'] - 1] = level;
      row[C['الصح'] - 1] = Number(d.score) || 0;
      row[C['عدد الأسئلة'] - 1] = Number(d.asked) || 0;
      row[C['عدد المحاولات'] - 1] = (Number(row[C['عدد المحاولات'] - 1]) || 1) + 1;
      row[C['الجلسة'] - 1] = cell_(d.sid, 20);
      sh.getRange(r, 1, 1, LEAD_HEADERS.length).setValues([row]);
      if (row[C['إيميل مؤكد'] - 1] !== 'نعم') sendConfirm_(email, d.name, level, row[C['رمز الإيميل'] - 1]);
    } else {
      const token = Utilities.getUuid();
      sh.appendRow([now, now, cell_(d.name, 60), cell_(email), level, Number(d.score) || 0, Number(d.asked) || 0, 1, 'نعم', 'لا', token, cell_(d.sid, 20)]);
      sendConfirm_(email, d.name, level, token);
    }
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput('ok');
}

function confirm_(t) {
  if (!t) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // نشيك التبويب الجديد، والقديم للروابط اللي انرسلت قبل التحديث
  const tabs = ss.getSheets().filter(s => s.getName().indexOf('المسجلين') === 0);
  for (const sh of tabs) {
    const v = sh.getDataRange().getValues();
    if (v.length < 2) continue;
    const tc = v[0].indexOf('رمز الإيميل'), cc = v[0].indexOf('إيميل مؤكد');
    if (tc < 0 || cc < 0) continue;
    for (let r = 1; r < v.length; r++) {
      if (v[r][tc] === t) { sh.getRange(r + 1, cc + 1).setValue('نعم'); return true; }
    }
  }
  return false;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const ok = confirm_(p.t);
  if (p.json) return ContentService.createTextOutput(JSON.stringify({ ok: ok })).setMimeType(ContentService.MimeType.JSON);
  return HtmlService.createHtmlOutput('<script>window.top.location.href=' + JSON.stringify(CONFIRM_PAGE + '?t=' + encodeURIComponent(p.t || '')) + '</script>');
}

function setup() {
  sheet_('النتائج', ['الوقت','الجلسة','الصح','عدد الأسئلة','المستوى','الإجابات','اللغة']);
  leads_();
  MailApp.getRemainingDailyQuota();
}
