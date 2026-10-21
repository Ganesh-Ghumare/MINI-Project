const test = require("node:test");
const assert = require("node:assert/strict");
const { createTrace, getCatalog } = require("../src/algorithms");

test("catalog exposes sorting, searching, and data structure algorithms", () => {
  const categories = new Set(getCatalog().map((item) => item.category));
  assert.deepEqual([...categories], ["sorting", "searching", "datastructures"]);
});

test("each sorting trace reaches an ascending result and records a final snapshot", () => {
  for (const algorithm of ["bubble", "selection", "insertion", "merge", "quick"]) {
    const trace = createTrace({ category: "sorting", algorithm, values: [5, -2, 5, 0, 3] });
    assert.deepEqual(trace.result.sortedValues, [-2, 0, 3, 5, 5], algorithm);
    assert.deepEqual(trace.steps.at(-1).values, trace.result.sortedValues, algorithm);
    assert.equal(trace.steps.at(-1).action, "complete", algorithm);
  }
});

test("search traces return the matching index and report missing values", () => {
  const linear = createTrace({ category: "searching", algorithm: "linear", values: [4, 7, 9], target: 7 });
  assert.equal(linear.result.foundIndex, 1);
  const binary = createTrace({ category: "searching", algorithm: "binary", values: [1, 3, 5, 7], target: 5 });
  assert.equal(binary.result.foundIndex, 2);
  const missing = createTrace({ category: "searching", algorithm: "binary", values: [1, 3, 5, 7], target: 6 });
  assert.equal(missing.result.foundIndex, -1);
  assert.equal(missing.steps.at(-1).action, "not-found");
});

test("binary search rejects unsorted inputs", () => {
  assert.throws(
    () => createTrace({ category: "searching", algorithm: "binary", values: [3, 1], target: 1 }),
    /sorted in ascending order/
  );
});

test("stack and queue traces preserve LIFO and FIFO removal order", () => {
  const stack = createTrace({ category: "datastructures", algorithm: "stack", values: [2, 4, 6] });
  const queue = createTrace({ category: "datastructures", algorithm: "queue", values: [2, 4, 6] });
  assert.deepEqual(stack.result.removedValues, [6, 4, 2]);
  assert.deepEqual(queue.result.removedValues, [2, 4, 6]);
  assert.deepEqual(stack.steps[1].values, [2]);
  assert.deepEqual(stack.steps[3].values, [2, 4, 6]);
  assert.deepEqual(stack.steps[4].values, [2, 4]);
  assert.deepEqual(queue.steps[4].values, [4, 6]);
  assert.equal(stack.steps.at(-1).values.length, 0);
  assert.equal(queue.steps.at(-1).values.length, 0);
});

test("stack and queue operation requests update only the requested end", () => {
  const pushed = createTrace({ category: "datastructures", algorithm: "stack", values: [2], operation: "push", value: 7 });
  assert.deepEqual(pushed.result.values, [2, 7]);
  assert.equal(pushed.steps.at(-1).action, "push");

  const popped = createTrace({ category: "datastructures", algorithm: "stack", values: [2, 7], operation: "pop" });
  assert.deepEqual(popped.result.values, [2]);
  assert.equal(popped.result.removedValue, 7);

  const enqueued = createTrace({ category: "datastructures", algorithm: "queue", values: [2], operation: "enqueue", value: 7 });
  assert.deepEqual(enqueued.result.values, [2, 7]);

  const dequeued = createTrace({ category: "datastructures", algorithm: "queue", values: [2, 7], operation: "dequeue" });
  assert.deepEqual(dequeued.result.values, [7]);
  assert.equal(dequeued.result.removedValue, 2);
});

test("stack and queue operation requests validate values and underflow", () => {
  assert.throws(
    () => createTrace({ category: "datastructures", algorithm: "stack", values: [], operation: "pop" }),
    /Cannot pop from an empty stack/
  );
  assert.throws(
    () => createTrace({ category: "datastructures", algorithm: "queue", values: [], operation: "dequeue" }),
    /Cannot dequeue from an empty queue/
  );
  assert.throws(
    () => createTrace({ category: "datastructures", algorithm: "stack", values: [], operation: "push", value: 1.5 }),
    /Value must be an integer/
  );
});

test("trace input is bounded and rejects non-integer values", () => {
  assert.throws(() => createTrace({ category: "sorting", algorithm: "bubble", values: [] }), /between 1 and 50/);
  assert.throws(() => createTrace({ category: "sorting", algorithm: "bubble", values: [1, 2.5] }), /integer/);
});
