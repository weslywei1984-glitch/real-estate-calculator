/* 台南小魏 LIFF 好友專屬鎖
 * 由 LINE 官方帳號 (@tainanwei) 的 LIFF 連結開啟才放行：
 * 1. 未登入 LINE → 引導用 LINE 開啟
 * 2. 已登入但不是官方帳號好友 → 引導加好友
 * 3. 通過 → 顯示客人 LINE 名稱問候
 * 本機開發（localhost / 127.0.0.1）預設略過檢查；加 ?liffgate=test 可強制測試畫面。
 */
(function () {
  var LIFF_ID = "2010638341-Jcjp32uy";
  var OA_ADD_URL = "https://line.me/R/ti/p/@tainanwei";
  var pagePath = location.pathname.split("/").pop();
  var LIFF_OPEN_URL = "https://liff.line.me/" + LIFF_ID + (pagePath && pagePath !== "index.html" ? "/" + pagePath : "");

  var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var forceTest = /[?&]liffgate=test/.test(location.search);
  if (isLocal && !forceTest) return;

  var style = document.createElement("style");
  style.textContent = [
    "#liffGate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;",
    "background:radial-gradient(circle at 20% 10%,rgba(202,161,93,.16),transparent 40%),linear-gradient(150deg,#0d1f1a,#123830 60%,#0d241f);}",
    "#liffGate .liff-card{display:grid;gap:14px;width:min(100%,420px);padding:30px 26px;border:1.5px solid rgba(245,210,142,.55);",
    "border-radius:22px;background:rgba(9,26,22,.72);box-shadow:0 30px 80px rgba(0,0,0,.4);text-align:center;color:#fffaf1;",
    "font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;}",
    "#liffGate .liff-mark{margin:0 auto;display:grid;place-items:center;width:64px;height:64px;border-radius:50%;",
    "border:1px solid rgba(255,232,168,.8);background:linear-gradient(145deg,#ffefbe,#d9a44b 60%,#805b24);color:#12342d;",
    "font-size:1.6rem;font-weight:900;}",
    "#liffGate h1{margin:0;font-size:1.28rem;line-height:1.4;color:#fffaf1;}",
    "#liffGate p{margin:0;color:rgba(255,250,241,.82);font-size:.95rem;line-height:1.75;}",
    "#liffGate .liff-btn{display:block;padding:13px 16px;border:0;border-radius:999px;font:inherit;font-weight:800;",
    "font-size:1rem;text-decoration:none;cursor:pointer;}",
    "#liffGate .liff-btn.gold{color:#17211d;background:linear-gradient(145deg,#fff0c5,#d0a15a 72%,#8d6731);}",
    "#liffGate .liff-btn.line{color:#fff;background:#06c755;}",
    "#liffGate .liff-btn.ghost{color:#f5d28e;background:transparent;border:1px solid rgba(245,210,142,.5);}",
    "#liffGate .liff-note{color:rgba(255,250,241,.55);font-size:.8rem;line-height:1.6;}",
    "#liffGate .liff-spinner{margin:6px auto 0;width:30px;height:30px;border:3px solid rgba(245,210,142,.25);",
    "border-top-color:#f5d28e;border-radius:50%;animation:liffSpin .75s linear infinite;}",
    "@keyframes liffSpin{to{transform:rotate(360deg)}}",
    ".liff-greeting{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;padding:10px 18px;",
    "border:1px solid rgba(245,210,142,.6);border-radius:999px;color:#fffaf1;background:rgba(13,38,32,.92);",
    "font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;font-size:.92rem;font-weight:700;",
    "box-shadow:0 14px 34px rgba(0,0,0,.3);animation:liffGreetIn .4s ease both;}",
    "@keyframes liffGreetIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}"
  ].join("");
  document.head.appendChild(style);

  var gate = document.createElement("div");
  gate.id = "liffGate";
  document.documentElement.appendChild(gate);

  function card(title, message, buttonsHtml, note) {
    gate.innerHTML =
      '<div class="liff-card">' +
      '<div class="liff-mark">魏</div>' +
      "<h1>" + title + "</h1>" +
      "<p>" + message + "</p>" +
      (buttonsHtml || "") +
      (note ? '<div class="liff-note">' + note + "</div>" : "") +
      "</div>";
  }

  function showChecking() {
    card("確認開啟來源中...", "台南小魏 買厝作伙 試算工具", '<div class="liff-spinner"></div>');
  }

  function showNeedLine() {
    card(
      "此工具為官方帳號好友專屬 🔒",
      "請加入「台南小魏 買厝作伙」LINE 官方帳號，並從 LINE 內開啟本試算工具。",
      '<a class="liff-btn line" href="' + OA_ADD_URL + '">➕ 加入官方帳號好友</a>' +
      '<a class="liff-btn gold" href="' + LIFF_OPEN_URL + '">已是好友，用 LINE 開啟</a>',
      "台南小魏 魏泉承 0927-617-207｜永慶不動產 小東南紡店"
    );
  }

  function showNeedFriend() {
    card(
      "加入好友即可免費使用 🎁",
      "本試算工具是「台南小魏 買厝作伙」好友專屬服務，加入官方帳號後馬上就能使用。",
      '<a class="liff-btn line" href="' + OA_ADD_URL + '">➕ 加入官方帳號好友</a>' +
      '<button class="liff-btn ghost" type="button" onclick="location.reload()">我已加入，重新整理</button>',
      "台南小魏 魏泉承 0927-617-207｜永慶不動產 小東南紡店"
    );
  }

  function pass() {
    gate.remove();
    try {
      window.liff.getProfile().then(function (profile) {
        if (!profile || !profile.displayName) return;
        var greeting = document.createElement("div");
        greeting.className = "liff-greeting";
        greeting.textContent = "👋 " + profile.displayName + " 您好，歡迎使用台南小魏的試算工具";
        document.body.appendChild(greeting);
        window.setTimeout(function () { greeting.remove(); }, 6000);
      }).catch(function () {});
    } catch (error) { /* 問候失敗不影響使用 */ }
  }

  showChecking();

  var sdk = document.createElement("script");
  sdk.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
  sdk.onerror = showNeedLine;
  sdk.onload = function () {
    window.liff.init({ liffId: LIFF_ID }).then(function () {
      if (!window.liff.isLoggedIn()) {
        if (window.liff.isInClient()) {
          // LINE 內開啟理論上必為登入狀態；保險起見仍導向登入
          window.liff.login({ redirectUri: location.href });
          return;
        }
        showNeedLine();
        return;
      }
      window.liff.getFriendship().then(function (friendship) {
        if (friendship && friendship.friendFlag === false) {
          showNeedFriend();
        } else {
          pass();
        }
      }).catch(pass); // 好友查詢失敗（例如尚未連結官方帳號）時不擋使用
    }).catch(showNeedLine);
  };
  document.head.appendChild(sdk);
})();
