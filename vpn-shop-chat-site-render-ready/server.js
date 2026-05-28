const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const SITE_PASSWORD = process.env.SITE_PASSWORD || "";
const ROOT = __dirname;
const STORE_FILE = process.env.STORE_FILE || path.join(ROOT, "data", "store.json");
const DATA_DIR = path.dirname(STORE_FILE);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function unauthorized(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Private Shop"',
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end("Password required");
}

function checkPassword(req) {
  if (!SITE_PASSWORD) return true;

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) return false;

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const [, password] = decoded.split(":");
  return password === SITE_PASSWORD;
}

function safePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const filePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.resolve(ROOT, "." + filePath);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function readBody(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 20 * 1024 * 1024) req.destroy();
  });
  req.on("end", () => callback(body));
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(store, callback) {
  fs.mkdir(DATA_DIR, { recursive: true }, (dirErr) => {
    if (dirErr) return callback(dirErr);
    fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8", callback);
  });
}

const server = http.createServer((req, res) => {
  if (!checkPassword(req)) return unauthorized(res);

  const requestPath = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
  if (requestPath === "/api/store") {
    if (req.method === "GET") return sendJSON(res, 200, readStore());
    if (req.method === "POST") {
      return readBody(req, (body) => {
        try {
          const nextStore = JSON.parse(body || "{}");
          writeStore(nextStore, (err) => {
            if (err) return sendJSON(res, 500, { ok: false, error: "Failed to save store" });
            sendJSON(res, 200, { ok: true });
          });
        } catch {
          sendJSON(res, 400, { ok: false, error: "Invalid JSON" });
        }
      });
    }
    return sendJSON(res, 405, { ok: false, error: "Method not allowed" });
  }

  const file = safePath(req.url || "/");
  if (!file) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }

    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Private shop site running at http://localhost:${PORT}`);
  if (SITE_PASSWORD) console.log("Basic password protection enabled.");
});
