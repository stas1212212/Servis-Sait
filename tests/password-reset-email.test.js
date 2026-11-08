"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {passwordResetEmail,SUBJECT}=require("../server/mail/password-reset-template");

const url="http://localhost:3000/reset-password.html#token="+"a".repeat(64);

test("PULT+ sends a fully branded responsive HTML email with a plain-text alternative",()=>{
  const mail=passwordResetEmail(url);
  assert.equal(mail.subject,SUBJECT);
  assert.match(mail.subject,/PULT\+/);
  assert.match(mail.text,/відновлення пароля/i);
  assert.match(mail.text,/20 хвилин/);
  assert.ok(mail.text.includes(url));
  assert.match(mail.html,/lang="uk"/);
  assert.match(mail.html,/<h1[^>]*>Відновлення пароля<\/h1>/);
  assert.match(mail.html,/СЕРВІС ЕЛЕКТРОНІКИ/);
  assert.match(mail.html,/Створити новий пароль/);
  assert.match(mail.html,/role="presentation"/);
  assert.match(mail.html,/width="100%"/);
  assert.match(mail.html,/20 хвилин/);
  assert.match(mail.html,/Не ви надсилали запит/);
  assert.ok(mail.html.split(url).length>=3,"reset URL exists in both the button and fallback");
  assert.doesNotMatch(mail.html,/<script|<iframe|<img|@import|<form/i);
});

test("password-reset link is safely escaped before inclusion in HTML attributes or text",()=>{
  const unsafe="https://pult.example/reset-password.html#token=abc&ref=%22><img%20src=x>";
  const mail=passwordResetEmail(unsafe);
  assert.ok(mail.text.includes(unsafe));
  assert.ok(mail.html.includes("&amp;ref="));
  assert.ok(mail.html.includes("&gt;&lt;img%20src=x&gt;"));
  assert.doesNotMatch(mail.html,/<img/i);
  assert.equal((mail.html.match(/<a href=/g)||[]).length,2);
});

test("template only accepts HTTPS or local development URLs",()=>{
  assert.throws(()=>passwordResetEmail("javascript:alert(1)"),TypeError);
  assert.throws(()=>passwordResetEmail("http://untrusted.example/reset-password.html#token=test"),TypeError);
  assert.doesNotThrow(()=>passwordResetEmail("https://pult.example/reset-password.html#token=123"));
});

test("existing password reset endpoint sends HTML and text using the current secure one-time link",()=>{
  const route=fs.readFileSync(path.join(__dirname,"../server/routes/experience.js"),"utf8");
  assert.ok(route.includes('const {passwordResetEmail}=require("../mail/password-reset-template")'));
  assert.ok(route.includes("JSON.stringify({from,to:[address],...passwordResetEmail(link)})"));
  assert.ok(route.includes("crypto.randomBytes(32)"));
  assert.ok(route.includes("hashToken(token)"));
  assert.ok(route.includes("NOW()+INTERVAL '20 minutes'"));
  assert.ok(route.includes('"/reset-password.html#token="'));
  assert.ok(route.includes("https://api.resend.com/emails"));
});
