const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { URL } = require("node:url");

const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const OFFICIAL_ORIGIN = "https://land-query.tainan.gov.tw";
const VALUE_CHANGE_PATH = "/query/rwd/valuechange.jsp";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
const DEBUG_TRANSFER = process.env.DEBUG_TRANSFER === "1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (CORS_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 20_000) {
        reject(new Error("資料量過大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function padFour(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? digits.padStart(4, "0").slice(-4) : "";
}

function officialUrl(input, resolvedR48 = input.r48) {
  const params = new URLSearchParams({
    menu: "true",
    SiteArea: input.siteArea,
    R48: resolvedR48,
    NUM1: padFour(input.mainNo),
    NUM2: padFour(input.subNo || "0"),
    LIDN: String(input.ownerId || "").trim().toUpperCase(),
    action: "Query1"
  });
  return `${OFFICIAL_ORIGIN}${VALUE_CHANGE_PATH}?${params.toString()}#queryResult`;
}

function cookieHeader(headers) {
  const cookies = [];
  if (typeof headers.getSetCookie === "function") {
    cookies.push(...headers.getSetCookie());
  }
  const single = headers.get("set-cookie");
  if (single) {
    cookies.push(...single.split(/,(?=\s*[^;,=\s]+=[^;,]+)/));
  }
  return cookies
    .map(cookie => cookie.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function formActionUrl(html) {
  const match = html.match(/<form[^>]+action="([^"]+)"/i);
  const action = match ? match[1].replace(/&amp;/g, "&") : "valuechange.jsp?menu=true";
  return new URL(action, `${OFFICIAL_ORIGIN}/query/rwd/valuechange.jsp`).toString();
}

function csrfToken(html) {
  return (html.match(/ajaxAreaR48\.jsp\?csrf\.param=([A-F0-9]+)/i) || [])[1]
    || (html.match(/csrf\.param=([A-F0-9]+)/i) || [])[1]
    || "";
}

function normalizeHeaders(headers = {}) {
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  return { ...headers };
}

function headerReader(headers = {}) {
  const normalized = {};
  Object.entries(headers).forEach(([key, value]) => {
    normalized[key.toLowerCase()] = value;
  });
  return {
    get(name) {
      const value = normalized[String(name).toLowerCase()];
      return Array.isArray(value) ? value.join(", ") : value || null;
    },
    getSetCookie() {
      const value = normalized["set-cookie"];
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    }
  };
}

function decodeBody(buffer, encoding = "") {
  const normalized = String(encoding || "").toLowerCase();
  if (normalized.includes("br")) return zlib.brotliDecompressSync(buffer);
  if (normalized.includes("gzip")) return zlib.gunzipSync(buffer);
  if (normalized.includes("deflate")) return zlib.inflateSync(buffer);
  return buffer;
}

function officialHttpsRequest(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers = normalizeHeaders(options.headers);
    let body = options.body || null;
    if (body instanceof URLSearchParams) body = body.toString();
    if (body && typeof body !== "string" && !Buffer.isBuffer(body)) body = String(body);
    if (body && !headers["Content-Length"] && !headers["content-length"]) {
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    if (!headers["Accept-Encoding"] && !headers["accept-encoding"]) {
      headers["Accept-Encoding"] = "gzip, deflate, br";
    }

    const req = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: options.method || "GET",
      headers,
      family: 4,
      timeout: 18_000
    }, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", async () => {
        const location = res.headers.location;
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && location && redirectCount < 3) {
          try {
            const redirected = new URL(location, target).toString();
            resolve(await officialHttpsRequest(redirected, {
              ...options,
              method: res.statusCode === 303 ? "GET" : options.method,
              body: res.statusCode === 303 ? null : body
            }, redirectCount + 1));
          } catch (error) {
            reject(error);
          }
          return;
        }

        let buffer = Buffer.concat(chunks);
        try {
          buffer = decodeBody(buffer, res.headers["content-encoding"]);
        } catch {
          // Keep the raw body if decoding fails; the parser can still report a readable failure.
        }
        const headersApi = headerReader(res.headers);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          url: target.toString(),
          headers: headersApi,
          async arrayBuffer() {
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          },
          async text() {
            return new TextDecoder("utf-8").decode(buffer);
          }
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("official request timeout"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function officialFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (fetchError) {
    try {
      return await officialHttpsRequest(url, options);
    } catch (httpsError) {
      httpsError.message = `${httpsError.message}; fetch=${fetchError.message}`;
      throw httpsError;
    }
  }
}

async function resolveOfficialR48(input, context) {
  const sectionName = String(input.sectionName || "").trim();
  if (!sectionName || !context.csrf) return input.r48;

  const url = `${OFFICIAL_ORIGIN}/query/ajaxAreaR48.jsp?${new URLSearchParams({
    "csrf.param": context.csrf,
    SiteArea: input.siteArea,
    R48: "R48",
    ViewActionName: "valuechange_va",
    dt: String(Date.now())
  }).toString()}`;

  const response = await officialFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 Local land value helper",
      "Accept": "text/plain,*/*",
      "Referer": `${OFFICIAL_ORIGIN}${VALUE_CHANGE_PATH}?menu=true`,
      ...(context.cookies ? { Cookie: context.cookies } : {})
    }
  });

  if (!response.ok) return input.r48;
  const text = (await response.text()).trim();
  const options = text
    ? text.replace(/#;#$/, "").split("#;#").map(item => {
      const [label, value] = item.split("#,#");
      return { label: (label || "").trim(), value: (value || "").trim() };
    })
    : [];
  const exact = options.find(option => option.label === sectionName);
  return exact?.value || input.r48;
}

async function fetchOfficialTransferPage(input) {
  const entryUrl = `${OFFICIAL_ORIGIN}${VALUE_CHANGE_PATH}?menu=true`;
  const entryResponse = await officialFetch(entryUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 Local land value helper",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  const entryBuffer = Buffer.from(await entryResponse.arrayBuffer());
  const entryHtml = new TextDecoder("utf-8").decode(entryBuffer);
  const cookies = cookieHeader(entryResponse.headers);
  const actionUrl = formActionUrl(entryHtml);
  const csrf = csrfToken(entryHtml);
  const officialR48 = await resolveOfficialR48(input, { csrf, cookies });
  const body = new URLSearchParams({
    "g-recaptcha-response": "",
    action: "Query1",
    r: "G",
    SiteArea: input.siteArea,
    R48: officialR48,
    R48check: officialR48,
    NUM1: padFour(input.mainNo),
    NUM2: padFour(input.subNo || "0"),
    LIDN: String(input.ownerId || "").trim().toUpperCase(),
    Type: "2",
    OldYear: "",
    button1: "查詢"
  });

  const response = await officialFetch(actionUrl, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 Local land value helper",
      "Accept": "text/html,application/xhtml+xml",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": OFFICIAL_ORIGIN,
      "Referer": entryUrl,
      ...(cookies ? { Cookie: cookies } : {})
    },
    body
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const charsetMatch = String(response.headers.get("content-type") || "").match(/charset=([^;]+)/i);
  const charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : "utf-8";
  return {
    response,
    html: new TextDecoder(charset).decode(buffer),
    actionUrl,
    csrf,
    officialR48
  };
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|table|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function resultHtml(html) {
  const idMatch = html.match(/<[^>]+id=["']queryResult["'][^>]*>([\s\S]*?)(?=<div class=["']card border-light|<div id=["']footer-wrap|<\/body>|$)/i);
  if (idMatch) return idMatch[1];
  const headingMatch = html.match(/前次移轉現值\s*-\s*查詢結果[\s\S]*?(?=本查詢系統資料以|如有疑義|此功能|<\/body>|$)/);
  return headingMatch ? headingMatch[0] : html;
}

function extractMoney(value) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 100 ? number : null;
}

function moneyFromTable(html) {
  const rows = [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(match => match[0]);
  let transferColumnIndex = -1;

  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => stripTags(match[1]));
    if (!cells.length) continue;

    const headerIndex = cells.findIndex(cell => /前次移轉現值|移轉現值/.test(cell));
    if (headerIndex >= 0) {
      transferColumnIndex = headerIndex;
      continue;
    }

    if (transferColumnIndex >= 0 && cells[transferColumnIndex]) {
      const value = extractMoney(cells[transferColumnIndex].match(/([0-9][0-9,]*(?:\.\d+)?)/)?.[1]);
      if (value) return value;
    }

    const rowText = cells.join(" ");
    const inlineValue = rowText.match(/(?:前次移轉現值|移轉現值)[^0-9]{0,30}([0-9][0-9,]*(?:\.\d+)?)/);
    const value = extractMoney(inlineValue?.[1]);
    if (value) return value;
  }
  return null;
}

function parseTransferValue(html) {
  const officialResultHtml = resultHtml(html);
  const text = stripTags(officialResultHtml);
  const exactResultStart = text.lastIndexOf("前次移轉現值 - 查詢結果");
  const resultStart = exactResultStart >= 0 ? exactResultStart : text.lastIndexOf("前次移轉現值");
  const resultText = resultStart >= 0 ? text.slice(resultStart) : text;
  const noData = /查無|無此地號|請檢查/.test(resultText);
  const resultMatch = resultText.match(/查詢結果[\s\S]{0,80}?([0-9][0-9,]*(?:\.\d+)?)\s*元\s*\/\s*平方公尺/);
  const valueAfterTransferHeader = resultText
    .split(/\b序號\b|序號/)
    .slice(1)
    .join(" ")
    .match(/([0-9][0-9,]*(?:\.\d+)?)/g)
    ?.map(extractMoney)
    .find(Boolean);
  const unitMatch = resultText.match(/([0-9][0-9,]*(?:\.\d+)?)\s*元\s*\/\s*平方公尺/);
  const tableValue = moneyFromTable(officialResultHtml);
  const value = tableValue
    || extractMoney(resultMatch?.[1])
    || valueAfterTransferHeader
    || extractMoney(unitMatch?.[1]);

  if (value) {
    return {
      found: true,
      value,
      message: `已查到前次移轉現值 ${value.toLocaleString("zh-TW")} 元/平方公尺。`,
      officialMessage: resultText.split("\n").slice(0, 30).join(" ").trim()
    };
  }

  return {
    found: false,
    value: null,
    message: noData
      ? "官方查詢結果：查無此地號資料，請確認權利人統一編號與地號是否正確。"
      : "官方頁面有回應，但未解析到前次移轉現值金額。",
    officialMessage: resultText.split("\n").slice(0, 30).join(" ").trim()
  };
}

function writeDebugResult(input, parsed) {
  if (!DEBUG_TRANSFER) return;
  const debugDir = path.join(ROOT, "output");
  const debugPath = path.join(debugDir, "last-transfer-result.json");
  const safeInput = {
    siteArea: input.siteArea,
    sectionName: input.sectionName || "",
    r48: input.r48,
    mainNo: padFour(input.mainNo),
    subNo: padFour(input.subNo || "0"),
    ownerIdMasked: String(input.ownerId || "").trim()
      ? `${String(input.ownerId).trim().slice(0, 2)}******${String(input.ownerId).trim().slice(-2)}`
      : ""
  };
  fs.mkdirSync(debugDir, { recursive: true });
  fs.writeFileSync(debugPath, JSON.stringify({
    checkedAt: new Date().toISOString(),
    input: safeInput,
    found: parsed.found,
    value: parsed.value,
    message: parsed.message,
    officialMessage: parsed.officialMessage
  }, null, 2), "utf8");
}

async function handleTransferValue(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { ok: false, message: "查詢資料格式不正確。" });
    return;
  }

  const required = ["siteArea", "r48", "mainNo", "ownerId"];
  const missing = required.filter(key => !String(input[key] || "").trim());
  if (missing.length) {
    sendJson(res, 400, { ok: false, message: "請先填行政區、小段名、地號與權利人統一編號。" });
    return;
  }

  try {
    const { response, html, actionUrl, officialR48 } = await fetchOfficialTransferPage(input);
    const url = officialUrl(input, officialR48);
    const parsed = parseTransferValue(html);
    writeDebugResult(input, parsed);
    sendJson(res, 200, {
      ok: true,
      officialUrl: url,
      submitUrl: actionUrl,
      requestMode: "official-form-post",
      resolvedR48: officialR48,
      status: response.status,
      ...parsed
    });
  } catch (error) {
    const url = officialUrl(input);
    sendJson(res, 502, {
      ok: false,
      officialUrl: url,
      message: `連線官方查詢失敗：${error.message}`
    });
  }
}

function serveFile(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/tainan-land-value-helper.html" : url.pathname);
  const target = path.normalize(path.join(ROOT, pathname));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const type = mimeTypes[path.extname(target).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/transfer-value") {
    handleTransferValue(req, res);
    return;
  }
  if (req.method === "GET") {
    serveFile(req, res, url);
    return;
  }
  sendJson(res, 405, { ok: false, message: "Method not allowed" });
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`台南公告現值工具已啟動：http://${displayHost}:${PORT}/tainan-land-value-helper.html`);
});
