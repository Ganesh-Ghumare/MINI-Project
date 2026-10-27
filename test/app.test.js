const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', style: {}, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, replaceChildren() {}, append() {}, focus() {} });
    return elements.get(id);
  };
  const context = vm.createContext({ document: { getElementById: get, querySelectorAll: () => [], createElement: () => get(Symbol()) }, window: {}, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(require.resolve('../app.js'), 'utf8').replace(/initialize\(\);\s*$/, ''), context);
  vm.runInContext('renderValues = () => {}; renderMetadata = () => {}; setStatus = () => {};', context);
  return { run: (source) => vm.runInContext(source, context), get };
}

test('clearing a structure resets its saved operation count', () => {
  const { run, get } = setup();
  get('algo-select').value = 'stack';
  run('state.category = "datastructures"; state.structures.stack = [7]; state.structureOperationCounts.stack = 5; handleReset();');
  assert.equal(run('state.structureOperationCounts.stack'), 0);
  assert.equal(run('state.structures.stack.length'), 0);
});

test('returning to the data structures category preserves saved values and counts', () => {
  const { run, get } = setup();
  get('algo-select').value = 'stack';
  run('state.structures.stack = [7]; state.structureOperationCounts.stack = 3; switchCategory("datastructures");');
  assert.equal(run('JSON.stringify(state.values)'), '[7]');
  assert.equal(run('state.operationCount'), 3);
});

test('target changes discard the old search trace', () => {
  const { run } = setup();
  run('state.category = "searching"; state.trace = {}; onTargetChange();');
  assert.equal(run('state.trace'), null);
});

test('input space estimates scale merge storage while keeping iterative auxiliary storage constant', () => {
  const { run } = setup();
  assert.match(run('inputSpaceEstimate("merge", 4)'), /4 input values \+ up to 4 merge slots/);
  assert.match(run('inputSpaceEstimate("merge", 16)'), /16 input values \+ up to 16 merge slots/);
  assert.match(run('inputSpaceEstimate("bubble", 16)'), /O\(1\) extra/);
  assert.match(run('inputSpaceEstimate("quick", 16)'), /up to 16 recursive frames/);
  assert.match(run('inputSpaceEstimate("queue", 0)'), /0 stored values/);
});

test('a trace response arriving after reset cannot overwrite the current view', async () => {
  const { run } = setup();
  run('selectedMetadata = () => ({ category: "sorting" }); requestJson = () => new Promise(resolve => { window.resolveRequest = resolve; });');
  const pending = run('buildTrace()');
  run('handleReset(); window.resolveRequest({ steps: [] });');
  assert.equal(await pending, false);
  assert.equal(run('state.trace'), null);
});

test('rapid structure operations issue only one request', async () => {
  const { run, get } = setup();
  get('algo-select').value = 'stack';
  get('structure-value-input').value = '7';
  run('state.category = "datastructures"; window.calls = 0; requestJson = () => { window.calls++; return new Promise(resolve => { window.resolveRequest = resolve; }); };');
  const pending = run('applyStructureOperation("push")');
  await run('applyStructureOperation("push")');
  assert.equal(run('window.calls'), 1);
  run('handleReset(); window.resolveRequest({ result: { values: [7] } });');
  await pending;
  assert.equal(run('state.values.length'), 0);
});
