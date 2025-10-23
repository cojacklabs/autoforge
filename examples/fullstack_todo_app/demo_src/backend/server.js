#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
let tasks = [{ id: 1, title: "Sample task", completed: false }];

function sendJSON(res, code, payload) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.url === "/tasks" && req.method === "GET") {
    return sendJSON(res, 200, { tasks });
  }
  if (req.url === "/tasks" && req.method === "POST") {
    const body = await parseBody(req);
    const id = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    const task = { id, title: body.title || "Untitled", completed: false };
    tasks.push(task);
    return sendJSON(res, 201, task);
  }
  if (req.url?.startsWith("/tasks/") && req.method === "PATCH") {
    const id = parseInt(req.url.split("/")[2], 10);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return sendJSON(res, 404, { error: "Not found" });
    const body = await parseBody(req);
    tasks[idx] = { ...tasks[idx], ...body };
    return sendJSON(res, 200, tasks[idx]);
  }
  if (req.url?.startsWith("/tasks/") && req.method === "DELETE") {
    const id = parseInt(req.url.split("/")[2], 10);
    tasks = tasks.filter((t) => t.id !== id);
    return sendJSON(res, 204, {});
  }

  // Serve simple frontend
  const indexPath = path.join(__dirname, "../frontend/index.html");
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { "Content-Type": "text/html" });
    return fs.createReadStream(indexPath).pipe(res);
  }
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Demo TODO server listening on http://localhost:${PORT}`);
});
