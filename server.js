const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const port = process.env.PORT || 3000;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolveRequestPath(req.url || "/");

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
