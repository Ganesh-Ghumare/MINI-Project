const API_ROOT = "/api";
const state = {
  catalog: [],
  category: "sorting",
  values: [],
  arrayValues: [],
  structures: { stack: [], queue: [] },
  structureOperationCounts: { stack: 0, queue: 0 },
  trace: null,
  stepIndex: 0,
  operationCount: 0,
  playing: false,
  timer: null,
  language: "py",
  requestVersion: 0,
  pending: false,
};

const byId = (id) => document.getElementById(id);
const categoryNames = {
  sorting: "Sorting",
  searching: "Searching",
  datastructures: "Stack & Queue"
};

function currentAlgorithm() {
  return byId("algo-select").value;
}

function selectedMetadata() {
  return state.catalog.find((item) => item.category === state.category && item.id === currentAlgorithm());
}

function getCurrentInputSize() {
  const customText = byId("custom-array-input").value.trim();
  if (customText) {
    const tokens = customText.split(",").map((token) => token.trim());
    if (tokens.length > 0 && tokens.every((token) => /^-?\d+$/.test(token))) {
      const values = tokens.map(Number);
      if (values.every((value) => value >= -9999 && value <= 9999)) {
        return Math.max(1, tokens.length);
      }
    }
  }
  return Math.max(1, state.arrayValues.length || Number(byId("size-slider").value) || 1);
}

function estimateComplexityWork(item, size) {
  if (!item) return "N/A";

  const n = Math.max(1, Number(size) || 1);
  const log2n = Math.log2(n);

  switch (item.id) {
    case "bubble":
    case "selection":
    case "insertion":
      return `~${Math.round((n * (n - 1)) / 2)} comparisons`;
    case "merge":
    case "quick":
      return `~${Math.round(n * log2n)} comparisons`;
    case "linear":
      return `~${n} checks`;
    case "binary":
      return `~${Math.floor(log2n) + 1} checks`;
    case "stack":
    case "queue":
      return `~1 step per operation`;
    default:
      return "Dynamic estimate";
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The server request failed.");
  return payload;
}

function inputSpaceEstimate(algorithm, n) {
  if (algorithm === "merge") return `${n} input values + up to ${n} merge slots + about ${Math.ceil(Math.log2(Math.max(1, n))) + 1} recursive frames (O(N) extra)`;
  if (algorithm === "quick") return `${n} input values + up to ${n} recursive frames in the worst case (O(N) extra; O(log N) average)`;
  if (algorithm === "stack" || algorithm === "queue") return `${n} stored values (O(N)); O(1) auxiliary storage per operation`;
  return `${n} input values + a fixed number of working variables (O(1) extra)`;
}

let analysisVersion = 0;
let analysisTimer;
function renderInputAnalysis() {
  const version = ++analysisVersion;
  clearTimeout(analysisTimer);
  const item = selectedMetadata();
  if (!item) return;
  let values = state.values.slice();
  const raw = byId("custom-array-input").value.trim();
  const structure = state.category === "datastructures";
  const status = byId("input-analysis-status");
  byId("input-time-work").textContent = "Calculating...";
  byId("input-space-work").textContent = "Waiting for valid input...";
  if (!structure && raw) {
    const tokens = raw.split(",").map((token) => token.trim());
    if (tokens.length > 50 || tokens.some((token) => !/^-?\d+$/.test(token) || Math.abs(Number(token)) > 9999)) {
      byId("input-time-work").textContent = "Invalid input";
      status.textContent = "Enter 1 to 50 comma-separated integers between -9999 and 9999.";
      return;
    }
    values = tokens.map(Number);
  }
  const n = values.length;
  byId("input-space-work").textContent = inputSpaceEstimate(item.id, n);
  status.textContent = `N = ${n}. ${raw && !structure ? "Preview of the typed input." : "Current input."}`;
  if (item.category === "datastructures") {
    byId("input-time-work").textContent = "1 push/pop or enqueue/dequeue operation · O(1)";
    return;
  }
  const payload = { category: item.category, algorithm: item.id, values };
  if (item.category === "searching") {
    const target = byId("search-target-input").value.trim();
    if (!target || !Number.isInteger(Number(target)) || Math.abs(Number(target)) > 9999) {
      byId("input-time-work").textContent = "Enter a valid integer target";
      return;
    }
    payload.target = Number(target);
  }
  analysisTimer = setTimeout(async () => {
    try {
      const trace = await requestJson(`${API_ROOT}/visualize`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (version !== analysisVersion) return;
      const { comparisons, operations } = trace.result;
      byId("input-time-work").textContent = `${comparisons} ${item.category === "searching" ? "checks" : "comparisons"} + ${operations} swaps / writes`;
      status.textContent += ` Work counted for this input. Average growth: ${item.average}; worst case: ${item.worst}.`;
    } catch (error) {
      if (version !== analysisVersion) return;
      byId("input-time-work").textContent = "Analysis unavailable";
      status.textContent = error.message;
    }
  }, 200);
}

function showToast(message, isError = false) {
  const toast = byId("toast");
  const icon = byId("toast-icon-wrap");
  byId("toast-text").textContent = message;
  icon.innerHTML = isError
    ? '<svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
    : '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
  toast.style.display = "flex";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.style.display = "none"; }, 2600);
}

function setStatus(message, error = false) {
  const status = byId("status-message");
  status.replaceChildren();
  const dot = document.createElement("span");
  dot.className = `inline-block w-2 h-2 rounded-full ${error ? "bg-rose-400" : state.playing ? "bg-amber-400" : "bg-emerald-400"}${state.playing ? " animate-pulse" : ""}`;
  const text = document.createElement("span");
  text.textContent = message;
  if (error) text.className = "text-rose-300";
  status.append(dot, text);
}

function stopPlayback() {
  state.playing = false;
  clearTimeout(state.timer);
  state.timer = null;
  byId("play-text").textContent = "Start";
  byId("play-icon-wrap").innerHTML = '<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
}

function setCodeDisplay() {
  const item = selectedMetadata();
  const snippets = {
    bubble: {
      py: "for end in range(len(values) - 1, 0, -1):\n    for i in range(end):\n        if values[i] > values[i + 1]:\n            values[i], values[i + 1] = values[i + 1], values[i]",
      c: "for (int end = n - 1; end > 0; --end) {\n    for (int i = 0; i < end; ++i) {\n        if (values[i] > values[i + 1]) swap(&values[i], &values[i + 1]);\n    }\n}",
      java: "for (int end = values.length - 1; end > 0; end--) {\n    for (int i = 0; i < end; i++) {\n        if (values[i] > values[i + 1]) swap(values, i, i + 1);\n    }\n}"
    },
    selection: {
      py: "for start in range(len(values)):\n    minimum = min(range(start, len(values)), key=values.__getitem__)\n    values[start], values[minimum] = values[minimum], values[start]",
      c: "for (int start = 0; start < n; ++start) {\n    int minimum = start;\n    for (int i = start + 1; i < n; ++i)\n        if (values[i] < values[minimum]) minimum = i;\n    swap(&values[start], &values[minimum]);\n}",
      java: "for (int start = 0; start < values.length; start++) {\n    int minimum = start;\n    for (int i = start + 1; i < values.length; i++)\n        if (values[i] < values[minimum]) minimum = i;\n    swap(values, start, minimum);\n}"
    },
    insertion: {
      py: "for i in range(1, len(values)):\n    value = values[i]\n    j = i\n    while j > 0 and values[j - 1] > value:\n        values[j] = values[j - 1]\n        j -= 1\n    values[j] = value",
      c: "for (int i = 1; i < n; ++i) {\n    int value = values[i], j = i;\n    while (j > 0 && values[j - 1] > value) {\n        values[j] = values[j - 1]; --j;\n    }\n    values[j] = value;\n}",
      java: "for (int i = 1; i < values.length; i++) {\n    int value = values[i], j = i;\n    while (j > 0 && values[j - 1] > value) {\n        values[j] = values[j - 1]; j--;\n    }\n    values[j] = value;\n}"
    },
    merge: {
      py: "def merge_sort(values):\n    if len(values) < 2:\n        return values\n    middle = len(values) // 2\n    left = merge_sort(values[:middle])\n    right = merge_sort(values[middle:])\n    return merge(left, right)",
      c: "void merge_sort(int values[], int left, int right) {\n    if (left >= right) return;\n    int middle = left + (right - left) / 2;\n    merge_sort(values, left, middle);\n    merge_sort(values, middle + 1, right);\n    merge(values, left, middle, right);\n}",
      java: "void mergeSort(int[] values, int left, int right) {\n    if (left >= right) return;\n    int middle = left + (right - left) / 2;\n    mergeSort(values, left, middle);\n    mergeSort(values, middle + 1, right);\n    merge(values, left, middle, right);\n}"
    },
    quick: {
      py: "def quick_sort(values, low, high):\n    if low >= high:\n        return\n    pivot = partition(values, low, high)\n    quick_sort(values, low, pivot - 1)\n    quick_sort(values, pivot + 1, high)",
      c: "void quick_sort(int values[], int low, int high) {\n    if (low >= high) return;\n    int pivot = partition(values, low, high);\n    quick_sort(values, low, pivot - 1);\n    quick_sort(values, pivot + 1, high);\n}",
      java: "void quickSort(int[] values, int low, int high) {\n    if (low >= high) return;\n    int pivot = partition(values, low, high);\n    quickSort(values, low, pivot - 1);\n    quickSort(values, pivot + 1, high);\n}"
    },
    linear: {
      py: "for index, value in enumerate(values):\n    if value == target:\n        return index\nreturn -1",
      c: "for (int i = 0; i < n; ++i)\n    if (values[i] == target) return i;\nreturn -1;",
      java: "for (int i = 0; i < values.length; i++)\n    if (values[i] == target) return i;\nreturn -1;"
    },
    binary: {
      py: "left, right = 0, len(values) - 1\nwhile left <= right:\n    middle = (left + right) // 2\n    if values[middle] == target: return middle\n    if values[middle] < target: left = middle + 1\n    else: right = middle - 1\nreturn -1",
      c: "int left = 0, right = n - 1;\nwhile (left <= right) {\n    int middle = left + (right - left) / 2;\n    if (values[middle] == target) return middle;\n    if (values[middle] < target) left = middle + 1;\n    else right = middle - 1;\n}\nreturn -1;",
      java: "int left = 0, right = values.length - 1;\nwhile (left <= right) {\n    int middle = left + (right - left) / 2;\n    if (values[middle] == target) return middle;\n    if (values[middle] < target) left = middle + 1;\n    else right = middle - 1;\n}\nreturn -1;"
    },
    stack: {
      py: "stack.append(value)  # push\nvalue = stack.pop()  # pop",
      c: "push(&stack, value);\nint value = pop(&stack);",
      java: "stack.push(value);\nint value = stack.pop();"
    },
    queue: {
      py: "queue.append(value)  # enqueue\nvalue = queue.popleft()  # dequeue",
      c: "enqueue(&queue, value);\nint value = dequeue(&queue);",
      java: "queue.offer(value);\nint value = queue.poll();"
    }
  };
  byId("code-display").textContent = item ? snippets[item.id][state.language] : "";
}

function renderMetadata() {
  const item = selectedMetadata();
  if (!item) return;

  const showComplexitySummary = state.category !== "datastructures";
  const inputSize = getCurrentInputSize();
  const workEstimate = estimateComplexityWork(item, inputSize);

  byId("badge-name").textContent = item.label;
  byId("comp-best").textContent = item.best;
  byId("comp-avg").textContent = item.average;
  byId("comp-worst").textContent = item.worst;
  byId("comp-space").textContent = item.space;
  byId("algo-description").textContent = item.description;
  byId("visualizer-heading").lastChild.textContent = ` ${item.label} Visualizer`;
  byId("complexity-input-size").textContent = String(inputSize);
  byId("complexity-estimate").textContent = workEstimate;
  byId("complexity-summary").classList.toggle("hidden", !showComplexitySummary);
  byId("complexity-formula").textContent = `${item.label} runs in ${item.average} time on average and uses ${item.space} extra space for an input of size N.`;
  setCodeDisplay();
  renderInputAnalysis();
}

function renderValues(step) {
  const stage = byId("visualization-stage");
  stage.replaceChildren();
  const values = step ? step.values : state.values;
  const active = new Set(step ? step.activeIndices : []);
  const sorted = new Set(step ? step.sortedIndices : []);
  const pivots = new Set(step ? step.pivotIndices : []);
  const displayCategory = state.trace?.category || selectedMetadata()?.category || state.category;

  if (displayCategory === "datastructures") {
    stage.classList.remove("items-end");
    stage.classList.add("items-center");
    const stack = currentAlgorithm() === "stack";
    stage.classList.add("structure-stage");
    const panel = document.createElement("div");
    panel.className = `structure-view ${stack ? "structure-view-stack" : "structure-view-queue"}`;

    const title = document.createElement("div");
    title.className = "structure-view-title";
    title.textContent = stack ? "Stack · Last in, first out" : "Queue · First in, first out";
    panel.append(title);

    const capacity = document.createElement("div");
    capacity.className = "structure-capacity";
    const capacityLabel = document.createElement("span");
    capacityLabel.textContent = `${values.length} of 50 spaces used`;
    const capacityTrack = document.createElement("span");
    capacityTrack.className = "structure-capacity-track";
    const capacityFill = document.createElement("span");
    capacityFill.className = "structure-capacity-fill";
    capacityFill.style.width = `${(values.length / 50) * 100}%`;
    capacityTrack.append(capacityFill);
    capacity.append(capacityLabel, capacityTrack);
    panel.append(capacity);

    if (values.length === 0) {
      const empty = document.createElement("div");
      empty.className = "structure-empty";
      const emptyIcon = document.createElement("span");
      emptyIcon.className = "structure-empty-icon";
      emptyIcon.textContent = stack ? "↓" : "→";
      const emptyTitle = document.createElement("strong");
      emptyTitle.textContent = stack ? "Your stack is empty" : "Your queue is empty";
      const emptyHint = document.createElement("span");
      emptyHint.textContent = stack ? "Type a value above, then push it onto the stack." : "Type a value above, then enqueue it at the back.";
      empty.append(emptyIcon, emptyTitle, emptyHint);
      panel.append(empty);
    } else if (stack) {
      const column = document.createElement("div");
      column.className = "stack-column";
      const marker = document.createElement("div");
      marker.className = "stack-top-marker";
      marker.innerHTML = '<span class="stack-marker-arrow">↓</span><span>TOP</span>';
      column.append(marker);

      values.slice().reverse().forEach((value, reversedIndex) => {
        const index = values.length - reversedIndex - 1;
        const block = document.createElement("div");
        block.className = `structure-item stack-item${index === values.length - 1 ? " is-endpoint" : ""}${active.has(index) ? " is-active" : ""}`;
        block.setAttribute("aria-label", `${value}${index === values.length - 1 ? ", top of stack" : ""}`);
        const itemIndex = document.createElement("span");
        itemIndex.className = "structure-item-index";
        itemIndex.textContent = String(index);
        const itemValue = document.createElement("strong");
        itemValue.textContent = String(value);
        block.append(itemIndex, itemValue);
        column.append(block);
      });
      const base = document.createElement("div");
      base.className = "stack-base";
      column.append(base);
      panel.append(column);
    } else {
      const queue = document.createElement("div");
      queue.className = "queue-track";
      const front = document.createElement("div");
      front.className = "queue-endpoint";
      front.innerHTML = '<span>FRONT</span><span class="queue-endpoint-arrow">↓</span>';
      queue.append(front);

      const items = document.createElement("div");
      items.className = "queue-items";
      values.forEach((value, index) => {
        const item = document.createElement("div");
        item.className = `structure-item queue-item${index === 0 ? " is-endpoint" : ""}${active.has(index) ? " is-active" : ""}`;
        item.setAttribute("aria-label", `${value}${index === 0 ? ", front of queue" : ""}`);
        const itemIndex = document.createElement("span");
        itemIndex.className = "structure-item-index";
        itemIndex.textContent = String(index);
        const itemValue = document.createElement("strong");
        itemValue.textContent = String(value);
        item.append(itemIndex, itemValue);
        items.append(item);
      });
      queue.append(items);

      const rear = document.createElement("div");
      rear.className = "queue-endpoint";
      rear.innerHTML = '<span>REAR</span><span class="queue-endpoint-arrow">↑</span>';
      queue.append(rear);
      panel.append(queue);
    }

    if (values.length === 0) {
      panel.classList.add("is-empty");
    }
    stage.append(panel);
    updateStructureButtons();
    return;
  }

  stage.classList.remove("structure-stage");
  stage.classList.remove("items-center");
  stage.classList.add("items-end");
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-end justify-center gap-0.5 w-full h-full";
  wrapper.style.maxWidth = "100%";
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 1);
  const span = Math.max(1, maximum - minimum);
  values.forEach((value, index) => {
    const column = document.createElement("div");
    column.className = "flex flex-col items-center justify-end h-full min-w-0";
    column.style.flex = "1 1 0";
    const bar = document.createElement("div");
    const color = pivots.has(index) ? "bg-rose-500" : active.has(index) ? "bg-amber-400" : sorted.has(index) ? "bg-emerald-400" : "bg-indigo-500";
    bar.className = `${color} rounded-t-sm w-full transition-all duration-200`;
    bar.style.height = `${Math.max(5, 20 + ((value - minimum) / span) * 75)}%`;
    const label = document.createElement("span");
    label.className = "text-[9px] sm:text-[10px] text-slate-300 font-mono mt-1 truncate max-w-full";
    label.textContent = String(value);
    column.append(bar, label);
    wrapper.append(column);
  });
  stage.append(wrapper);
}

function renderStep(index) {
  if (!state.trace) {
    renderValues(null);
    return;
  }
  state.stepIndex = Math.max(0, Math.min(index, state.trace.steps.length - 1));
  const step = state.trace.steps[state.stepIndex];
  renderValues(step);
  byId("step-badge").textContent = `Step ${state.stepIndex} / ${state.trace.steps.length - 1}`;
  byId("step-explanation-text").textContent = step.explanation;
  byId("stat-comparisons").textContent = step.comparisons;
  byId("stat-swaps").textContent = state.category === "datastructures" ? state.operationCount : step.operations;
  byId("stat-steps").textContent = state.stepIndex;
  if (state.stepIndex === state.trace.steps.length - 1) {
    stopPlayback();
    setStatus(state.trace.result.foundIndex === -1 && state.trace.category === "searching" ? "Target not found." : "Trace complete.");
  } else {
    setStatus(step.explanation, state.trace.steps[state.stepIndex].action === "not-found");
  }
}

async function buildTrace() {
  if (state.pending) return false;
  stopPlayback();
  const version = state.requestVersion;
  const algorithmCategory = state.category;
  const payload = { category: algorithmCategory, algorithm: currentAlgorithm(), values: state.values };
  if (algorithmCategory === "searching") {
    const targetInput = byId("search-target-input").value.trim();
    const target = Number(targetInput);
    if (!targetInput || !Number.isInteger(target)) throw new Error("Enter a whole-number target.");
    payload.target = target;
  }
  state.pending = true;
  let trace;
  try {
    trace = await requestJson(`${API_ROOT}/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  } finally {
    if (version === state.requestVersion) state.pending = false;
  }
  if (version !== state.requestVersion) return false;
  state.trace = trace;
  renderMetadata();
  renderStep(0);
  return true;
}

function handleStepForward() {
  if (!state.trace) {
    buildTrace().then((loaded) => { if (loaded) renderStep(1); }).catch((error) => showToast(error.message, true));
    return;
  }
  renderStep(state.stepIndex + 1);
}

function handleStepBackward() {
  if (!state.trace) {
    buildTrace().then((loaded) => { if (loaded) renderStep(0); }).catch((error) => showToast(error.message, true));
    return;
  }
  stopPlayback();
  renderStep(state.stepIndex - 1);
}

function handlePlayPause() {
  if (state.playing) {
    stopPlayback();
    setStatus("Playback paused.");
    return;
  }
  const start = () => {
    if (!state.trace || state.stepIndex >= state.trace.steps.length - 1) return;
    state.playing = true;
    byId("play-text").textContent = "Pause";
    byId("play-icon-wrap").innerHTML = '<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
    setStatus("Playing visualization.");
    const advance = () => {
      if (!state.playing) return;
      if (state.stepIndex >= state.trace.steps.length - 1) {
        stopPlayback();
        return;
      }
      renderStep(state.stepIndex + 1);
      if (state.playing) state.timer = setTimeout(advance, 800);
    };
    advance();
  };
  if (!state.trace) {
    buildTrace().then((loaded) => { if (loaded) start(); }).catch((error) => showToast(error.message, true));
  } else if (state.stepIndex >= state.trace.steps.length - 1) {
    renderStep(0);
    start();
  } else {
    start();
  }
}

function handleReset() {
  state.requestVersion += 1;
  state.pending = false;
  stopPlayback();
  if (state.category === "datastructures") {
    const algorithm = currentAlgorithm();
    state.values = [];
    state.structures[algorithm] = [];
    state.structureOperationCounts[algorithm] = 0;
    state.trace = null;
    state.stepIndex = 0;
    state.operationCount = 0;
    renderValues(null);
    byId("step-badge").textContent = "Step 0 / 0";
    byId("step-explanation-text").textContent = "The data structure is empty. Choose an operation to begin.";
    byId("stat-comparisons").textContent = "0";
    byId("stat-swaps").textContent = "0";
    byId("stat-steps").textContent = "0";
    setStatus(`${algorithm === "stack" ? "Stack" : "Queue"} cleared.`);
    renderInputAnalysis();
    return;
  }
  if (state.trace) renderStep(0);
  else {
    state.trace = null;
    byId("step-badge").textContent = "Step 0 / 0";
    byId("step-explanation-text").textContent = "Ready. Choose an algorithm and click Start, or use Prev / Next to step through at your own pace.";
    byId("stat-comparisons").textContent = "0";
    byId("stat-swaps").textContent = "0";
    byId("stat-steps").textContent = "0";
    renderValues(null);
  }
  setStatus("Ready. Choose an algorithm and press Start, Next, or Prev.");
}

function handleGenerate() {
  const size = Number(byId("size-slider").value);
  state.values = Array.from({ length: size }, () => Math.floor(Math.random() * 96) + 5);
  state.arrayValues = state.values.slice();
  state.trace = null;
  byId("custom-array-input").value = "";
  renderMetadata();
  handleReset();
  showToast("Generated a new array.");
}

function applyCustomData() {
  const raw = byId("custom-array-input").value.trim();
  if (!raw) {
    showToast("Enter comma-separated integers first.", true);
    return;
  }
  const tokens = raw.split(",").map((token) => token.trim());
  if (tokens.some((token) => !/^-?\d+$/.test(token))) {
    showToast("Use comma-separated whole numbers only.", true);
    return;
  }
  const values = tokens.map(Number);
  if (values.length > 50 || values.some((value) => value < -9999 || value > 9999)) {
    showToast("Use up to 50 integers between -9999 and 9999.", true);
    return;
  }
  state.values = values;
  state.arrayValues = values.slice();
  state.trace = null;
  byId("size-slider").value = Math.max(4, Math.min(50, values.length));
  byId("size-label").textContent = values.length;
  renderMetadata();
  handleReset();
  showToast("Custom data applied.");
}

function pickRandomTarget() {
  if (state.values.length) byId("search-target-input").value = state.values[Math.floor(Math.random() * state.values.length)];
  onTargetChange();
}

function onTargetChange() {
  state.trace = null;
  handleReset();
  renderInputAnalysis();
}

function onSizeChange(value) {
  byId("size-label").textContent = value;
  byId("custom-array-input").value = "";
  state.values = Array.from({ length: Number(value) }, () => Math.floor(Math.random() * 96) + 5);
  state.arrayValues = state.values.slice();
  state.trace = null;
  renderMetadata();
  handleReset();
}

function onAlgoChange() {
  state.requestVersion += 1;
  state.pending = false;
  stopPlayback();
  state.trace = null;
  if (state.category === "datastructures") {
    state.values = state.structures[currentAlgorithm()].slice();
    state.operationCount = state.structureOperationCounts[currentAlgorithm()];
    updateStructureControls();
    updateStructureClearButton();
    renderMetadata();
    renderValues(null);
    byId("step-badge").textContent = "Step 0 / 0";
    byId("step-explanation-text").textContent = state.values.length
      ? `${currentAlgorithm() === "stack" ? "Stack" : "Queue"} restored. Choose an operation to continue.`
      : "The data structure is empty. Choose an operation to begin.";
    byId("stat-comparisons").textContent = "0";
    byId("stat-swaps").textContent = state.operationCount;
    byId("stat-steps").textContent = "0";
    setStatus(`${currentAlgorithm() === "stack" ? "Stack" : "Queue"} ready.`);
    return;
  }
  renderMetadata();
  handleReset();
}

function updateStructureClearButton() {
  const name = currentAlgorithm() === "stack" ? "Stack" : "Queue";
  byId("btn-reset-label").textContent = `Clear ${name}`;
  byId("btn-reset").title = `Clear ${name.toLowerCase()}`;
}

function updateStructureControls() {
  const stack = currentAlgorithm() === "stack";
  const addLabel = stack ? "Push" : "Enqueue";
  const removeLabel = stack ? "Pop" : "Dequeue";
  byId("structure-value-label").textContent = stack ? "Value to push" : "Value to enqueue";
  byId("structure-value-input").placeholder = stack ? "e.g. 42" : "e.g. 42";
  byId("structure-value-input").setAttribute("aria-label", stack ? "Value to push" : "Value to enqueue");
  byId("btn-structure-add").textContent = addLabel;
  byId("btn-structure-add").setAttribute("onclick", `applyStructureOperation('${stack ? "push" : "enqueue"}')`);
  byId("btn-structure-add").setAttribute("aria-label", stack ? "Push value onto stack" : "Enqueue value at back of queue");
  byId("btn-structure-remove").textContent = removeLabel;
  byId("btn-structure-remove").setAttribute("onclick", `applyStructureOperation('${stack ? "pop" : "dequeue"}')`);
  byId("btn-structure-remove").setAttribute("aria-label", stack ? "Pop value from top of stack" : "Dequeue value from front of queue");
  byId("structure-value-control").classList.remove("hidden");
  byId("stat-swaps-label").textContent = "Operations:";
  updateStructureButtons();
}

function updateStructureButtons() {
  const stack = currentAlgorithm() === "stack";
  const full = state.pending || state.values.length >= 50;
  const empty = state.pending || state.values.length === 0;
  byId("btn-structure-add").disabled = full;
  byId("btn-structure-remove").disabled = empty;
  byId("btn-structure-add").title = full ? "The structure is at capacity." : (stack ? "Push this value onto the top of the stack." : "Enqueue this value at the rear of the queue.");
  byId("btn-structure-remove").title = empty ? "The structure is empty." : (stack ? "Pop the top value from the stack." : "Dequeue the front value from the queue.");
}

async function applyStructureOperation(operation) {
  if (state.category !== "datastructures" || state.pending) return;
  operation = operation || (currentAlgorithm() === "stack" ? "push" : "enqueue");
  if ((byId("btn-structure-add").disabled && (operation === "push" || operation === "enqueue"))
    || (byId("btn-structure-remove").disabled && (operation === "pop" || operation === "dequeue"))) return;
  const adding = operation === "push" || operation === "enqueue";
  const payload = {
    category: "datastructures",
    algorithm: currentAlgorithm(),
    values: state.values,
    operation
  };
  if (adding) {
    const rawValue = byId("structure-value-input").value.trim();
    const value = Number(rawValue);
    if (!rawValue || !Number.isInteger(value) || value < -9999 || value > 9999) {
      showToast("Enter a whole-number value between -9999 and 9999.", true);
      return;
    }
    payload.value = value;
  }

  stopPlayback();
  const version = state.requestVersion;
  state.pending = true;
  updateStructureButtons();
  try {
    const trace = await requestJson(`${API_ROOT}/visualize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (version !== state.requestVersion) return;
    state.trace = trace;
    state.values = state.trace.result.values;
    state.structures[currentAlgorithm()] = state.values.slice();
    state.operationCount += 1;
    state.structureOperationCounts[currentAlgorithm()] = state.operationCount;
    renderStep(state.trace.steps.length - 1);
    renderInputAnalysis();
    if (adding) byId("structure-value-input").value = "";
    if (adding) byId("structure-value-input").focus();
  } catch (error) {
    if (version === state.requestVersion) showToast(error.message, true);
  } finally {
    if (version === state.requestVersion) {
      state.pending = false;
      updateStructureButtons();
    }
  }
}

function switchCategory(category) {
  if (!categoryNames[category]) return;
  state.requestVersion += 1;
  state.pending = false;
  stopPlayback();
  state.category = category;
  state.trace = null;
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    const active = tab.id === `tab-${category}`;
    tab.classList.toggle("bg-indigo-600", active);
    tab.classList.toggle("text-white", active);
    tab.classList.toggle("shadow-sm", active);
    tab.classList.toggle("text-slate-400", !active);
    tab.classList.toggle("font-semibold", active);
    tab.classList.toggle("font-medium", !active);
  });

  const available = state.catalog.filter((item) => item.category === category);
  const select = byId("algo-select");
  select.replaceChildren();
  available.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    select.append(option);
  });

  if (category === "datastructures") {
    state.values = state.structures[currentAlgorithm()].slice();
    state.operationCount = state.structureOperationCounts[currentAlgorithm()];
  } else {
    state.values = state.arrayValues.slice();
    if (state.values.length === 0) {
      state.values = Array.from({ length: Number(byId("size-slider").value) }, () => Math.floor(Math.random() * 96) + 5);
      state.arrayValues = state.values.slice();
    }
    state.operationCount = 0;
  }

  const searchActive = category === "searching";
  const isStructure = category === "datastructures";
  byId("search-target-control").classList.toggle("hidden", !searchActive);
  byId("custom-data-control").classList.toggle("hidden", isStructure);
  byId("structure-control").classList.toggle("hidden", !isStructure);
  byId("structure-control").style.display = isStructure ? "flex" : "none";
  byId("algo-label").textContent = isStructure ? "Data Structure" : "Algorithm";
  if (isStructure) updateStructureControls();
  byId("array-size-control").classList.toggle("hidden", isStructure);
  byId("controls-divider").classList.toggle("hidden", isStructure);
  byId("visualizer-legend").classList.toggle("hidden", isStructure);
  byId("stat-comparisons-container").classList.toggle("hidden", isStructure);
  byId("stat-steps-container").classList.toggle("hidden", isStructure);
  byId("stat-swaps-label").textContent = isStructure ? "Operations:" : "Swaps / Ops:";
  ["btn-generate", "btn-prev", "btn-play", "btn-next"].forEach((id) => byId(id).classList.toggle("hidden", isStructure));
  if (isStructure) updateStructureClearButton();
  else {
    byId("btn-reset-label").textContent = "Reset";
    byId("btn-reset").title = "Reset State";
  }

  renderMetadata();
  if (isStructure) onAlgoChange();
  else handleReset();
}

function switchFileLang(language) {
  state.language = language;
  document.querySelectorAll(".file-tab").forEach((tab) => {
    const active = tab.id === `file-tab-${language}`;
    tab.classList.toggle("bg-indigo-600", active);
    tab.classList.toggle("text-white", active);
    tab.classList.toggle("font-semibold", active);
    tab.classList.toggle("text-slate-400", !active);
  });
  setCodeDisplay();
}

async function copyActiveCode() {
  try {
    await navigator.clipboard.writeText(byId("code-display").textContent);
    byId("copy-label").textContent = "Copied";
    setTimeout(() => { byId("copy-label").textContent = "Copy"; }, 1400);
  } catch (error) {
    showToast("Clipboard access is unavailable in this browser.", true);
  }
}

function toggleAudio() {
  showToast("Audio feedback is not implemented yet.", true);
}

async function initialize() {
  try {
    byId("search-target-input").addEventListener("input", onTargetChange);
    byId("custom-array-input").addEventListener("input", renderMetadata);
    const response = await requestJson(`${API_ROOT}/algorithms`);
    state.catalog = response.algorithms;
    state.values = Array.from({ length: Number(byId("size-slider").value) }, () => Math.floor(Math.random() * 96) + 5);
    state.arrayValues = state.values.slice();
    switchCategory("sorting");
  } catch (error) {
    setStatus(`Backend unavailable: ${error.message}`, true);
    byId("step-explanation-text").textContent = "Start the backend with npm start, then refresh this page.";
  }
}

window.switchCategory = switchCategory;
window.switchFileLang = switchFileLang;
window.copyActiveCode = copyActiveCode;
window.toggleAudio = toggleAudio;
window.onAlgoChange = onAlgoChange;
window.applyCustomData = applyCustomData;
window.pickRandomTarget = pickRandomTarget;
window.onSizeChange = onSizeChange;
window.handleGenerate = handleGenerate;
window.handleStepBackward = handleStepBackward;
window.handlePlayPause = handlePlayPause;
window.handleStepForward = handleStepForward;
window.handleReset = handleReset;
window.applyStructureOperation = applyStructureOperation;

initialize();
