import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const getJSON = (path) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "localhost", port: 3001, path, method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data || "{}")));
      },
    );
    req.on("error", reject);
    req.end();
  });

test("server exposes tasks list", async () => {
  const data = await getJSON("/tasks");
  assert.ok(Array.isArray(data.tasks));
});
