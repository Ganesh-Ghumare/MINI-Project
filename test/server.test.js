const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");

test("API serves health, catalog, and generated traces", async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const pageResponse = await fetch(baseUrl);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Interactive Algorithm & Data Structure Playground/);

  const sourceResponse = await fetch(`${baseUrl}/server.js`);
  assert.equal(sourceResponse.status, 404);

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.deepEqual(await healthResponse.json(), { status: "ok" });

  const catalogResponse = await fetch(`${baseUrl}/api/algorithms`);
  assert.equal(catalogResponse.status, 200);
  assert.equal((await catalogResponse.json()).algorithms.length, 9);

  const traceResponse = await fetch(`${baseUrl}/api/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "sorting", algorithm: "bubble", values: [3, 1, 2] })
  });
  const trace = await traceResponse.json();
  assert.equal(traceResponse.status, 200);
  assert.deepEqual(trace.result.sortedValues, [1, 2, 3]);

  const pushResponse = await fetch(`${baseUrl}/api/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "datastructures", algorithm: "stack", values: [], operation: "push", value: 9 })
  });
  assert.equal(pushResponse.status, 200);
  assert.deepEqual((await pushResponse.json()).result.values, [9]);
});

test("API responds with a useful client error for invalid requests", async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once("listening", resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "searching", algorithm: "binary", values: [2, 1], target: 1 })
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /sorted in ascending order/);
});
