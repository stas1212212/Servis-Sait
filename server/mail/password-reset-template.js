"use strict";

// Transactional HTML email: inline styles and tables for Gmail, Outlook and phones.
// No external images, scripts, trackers or remote fonts.
const SUBJECT="PULT+ — Відновлення пароля";

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}

function passwordResetEmail(resetUrl){
  if(typeof resetUrl!=="string"||!(/^(https:\/\/|http:\/\/localhost(?::\d+)?\/)/.test(resetUrl)))
    throw new TypeError("Password reset email requires an HTTPS or localhost URL");
  const url=escapeHtml(resetUrl);
  const text=[
    "PULT+ — відновлення пароля",
    "",
    "Ми отримали запит на зміну пароля до вашого акаунта PULT+.",
    "Щоб створити новий пароль, відкрийте це одноразове посилання:",
    resetUrl,
    "",
    "Посилання діє 20 хвилин і може бути використане лише один раз.",
    "Якщо ви не запитували відновлення пароля, просто проігноруйте цей лист.",
    "Нікому не передавайте це посилання — навіть працівникам PULT+.",
    "",
    "З повагою, команда PULT+",
    "Сервіс електроніки",
    "",
    "Це автоматичний лист. Відповідати на нього не потрібно."
  ].join("\n");

  const html=[
'<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<meta name="color-scheme" content="light"><title>Відновлення пароля — PULT+</title></head>',
'<body style="margin:0;padding:0;background:#eef3fa;color:#14253d;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">',
'<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Відновіть доступ до PULT+. Посилання діє 20 хвилин.</div>',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef3fa;"><tr><td align="center" style="padding:36px 16px 44px;">',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#fff;border:1px solid #dce6f3;border-radius:18px;overflow:hidden;">',
'<tr><td style="background:#133d86;padding:29px 34px;">',
'<div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#fff;line-height:1.15;"><span style="color:#80baff;">✚</span> PULT+</div>',
'<div style="margin-top:6px;font-size:12px;letter-spacing:1.2px;color:#dae8ff;">СЕРВІС ЕЛЕКТРОНІКИ</div></td></tr>',
'<tr><td style="padding:34px 34px 14px;">',
'<div style="font-size:12px;line-height:20px;font-weight:700;letter-spacing:1.1px;color:#2563eb;text-transform:uppercase;">Безпека акаунта</div>',
'<h1 style="margin:12px 0 16px;font-size:28px;line-height:1.25;color:#122340;font-weight:800;">Відновлення пароля</h1>',
'<p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#465874;">Вітаємо!</p>',
'<p style="margin:0;font-size:16px;line-height:1.7;color:#465874;">Ми отримали запит на зміну пароля до вашого акаунта PULT+. Натисніть кнопку нижче, щоб створити новий пароль.</p></td></tr>',
'<tr><td align="center" style="padding:18px 34px 20px;">',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#2563eb" style="border-radius:11px;">',
'<a href="',url,'" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2563eb;border-radius:11px;border:1px solid #2563eb;color:#fff;font-size:16px;font-weight:700;line-height:22px;padding:16px 29px;text-decoration:none;">Створити новий пароль</a>',
'</td></tr></table></td></tr>',
'<tr><td style="padding:0 34px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#edf4ff;border:1px solid #d9e7ff;border-radius:12px;"><tr>',
'<td style="padding:15px 17px;color:#294c7b;font-size:14px;line-height:1.6;"><strong>Посилання дійсне протягом 20 хвилин.</strong> Його можна використати лише один раз.</td>',
'</tr></table></td></tr>',
'<tr><td style="padding:0 34px 29px;">',
'<p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 8px;">Якщо кнопка не працює, скопіюйте посилання та вставте його в адресний рядок браузера:</p>',
'<p style="font-size:12px;line-height:1.6;margin:0;overflow-wrap:anywhere;word-break:break-all;"><a href="',url,'" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">',url,'</a></p>',
'</td></tr>',
'<tr><td style="border-top:1px solid #e7edf5;padding:24px 34px 28px;">',
'<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#425673;"><strong>Не ви надсилали запит?</strong> Просто проігноруйте цей лист. Ваш пароль залишиться незмінним.</p>',
'<p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Нікому не передавайте посилання для відновлення — навіть працівникам PULT+.</p>',
'</td></tr></table>',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;"><tr>',
'<td align="center" style="padding:24px 25px 0;color:#7b8ba2;font-size:12px;line-height:1.8;">',
'<strong style="color:#48617e;">PULT+ · Сервіс електроніки</strong><br>Це автоматичний службовий лист. Відповідати на нього не потрібно.',
'</td></tr></table></td></tr></table></body></html>'
  ].join("");
  return {subject:SUBJECT,text,html};
}
module.exports={passwordResetEmail,SUBJECT};
