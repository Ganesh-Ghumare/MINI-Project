const catalog = [
  {
    category: "sorting",
    id: "bubble",
    label: "Bubble Sort",
    best: "O(N)",
    average: "O(N²)",
    worst: "O(N²)",
    space: "O(1)",
    description: "Repeatedly compares neighboring values and swaps them when they are out of order. Each pass moves the largest remaining value to the end."
  },
  {
    category: "sorting",
    id: "selection",
    label: "Selection Sort",
    best: "O(N²)",
    average: "O(N²)",
    worst: "O(N²)",
    space: "O(1)",
    description: "Finds the smallest value in the unsorted portion and moves it into its final position."
  },
  {
    category: "sorting",
    id: "insertion",
    label: "Insertion Sort",
    best: "O(N)",
    average: "O(N²)",
    worst: "O(N²)",
    space: "O(1)",
    description: "Builds a sorted prefix by inserting each new value into its correct position."
  },
  {
    category: "sorting",
    id: "merge",
    label: "Merge Sort",
    best: "O(N log N)",
    average: "O(N log N)",
    worst: "O(N log N)",
    space: "O(N)",
    description: "Divides the array into halves, sorts each half, then merges the sorted halves."
  },
  {
    category: "sorting",
    id: "quick",
    label: "Quick Sort",
    best: "O(N log N)",
    average: "O(N log N)",
    worst: "O(N²)",
    space: "O(log N)",
    description: "Partitions values around a pivot, then recursively sorts the values on either side."
  },
  {
    category: "searching",
    id: "linear",
    label: "Linear Search",
    best: "O(1)",
    average: "O(N)",
    worst: "O(N)",
    space: "O(1)",
    description: "Checks each value in order until the target is found or the array is exhausted."
  },
  {
    category: "searching",
    id: "binary",
    label: "Binary Search",
    best: "O(1)",
    average: "O(log N)",
    worst: "O(log N)",
    space: "O(1)",
    description: "Repeatedly halves a sorted search range. The input must be sorted in ascending order."
  },
  {
    category: "datastructures",
    id: "stack",
    label: "Stack (LIFO)",
    best: "O(1)",
    average: "O(1)",
    worst: "O(1)",
    space: "O(N)",
    description: "Push values onto the stack or pop the top value. The last value pushed is the first value removed."
  },
  {
    category: "datastructures",
    id: "queue",
    label: "Queue (FIFO)",
    best: "O(1)",
    average: "O(1)",
    worst: "O(1)",
    space: "O(N)",
    description: "Enqueue values at the back of the queue or dequeue from the front. The first value enqueued is the first value removed."
  }
];

function makeStep(values, activeIndices, sortedIndices, stats, explanation, action, pivotIndices = []) {
  return {
    values: values.slice(),
    activeIndices: activeIndices.slice(),
    sortedIndices: sortedIndices.slice(),
    pivotIndices: pivotIndices.slice(),
    comparisons: stats.comparisons,
    operations: stats.operations,
    explanation,
    action
  };
}

function createTrace(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("Request body must be a JSON object.");
  }

  const { category, algorithm, values, target, operation, value } = request;
  const definition = catalog.find((item) => item.category === category && item.id === algorithm);
  if (!definition) {
    throw new Error("Choose a supported category and algorithm.");
  }
  const allowsEmpty = category === "datastructures" && operation !== undefined;
  if (!Array.isArray(values) || (!allowsEmpty && values.length < 1) || values.length > 50) {
    throw new Error(`Values must be an array containing between ${allowsEmpty ? 0 : 1} and 50 integers.`);
  }
  if (!values.every((value) => Number.isInteger(value) && value >= -9999 && value <= 9999)) {
    throw new Error("Every value must be an integer between -9999 and 9999.");
  }

  if (category === "datastructures" && operation !== undefined) {
    const isStack = algorithm === "stack";
    const addOperation = isStack ? "push" : "enqueue";
    const removeOperation = isStack ? "pop" : "dequeue";
    if (operation !== addOperation && operation !== removeOperation) {
      throw new Error(`Choose ${addOperation} or ${removeOperation} for this data structure.`);
    }
    if (values.length > 50) {
      throw new Error("A data structure can contain at most 50 values.");
    }

    const nextValues = values.slice();
    const stats = { comparisons: 0, operations: 1 };
    const adding = operation === addOperation;
    if (adding) {
      if (!Number.isInteger(value) || value < -9999 || value > 9999) {
        throw new Error("Value must be an integer between -9999 and 9999.");
      }
      if (nextValues.length >= 50) {
        throw new Error("A data structure can contain at most 50 values.");
      }
      nextValues.push(value);
    } else {
      if (nextValues.length === 0) {
        throw new Error(`Cannot ${removeOperation} from an empty ${isStack ? "stack" : "queue"}.`);
      }
      if (isStack) nextValues.pop();
      else nextValues.shift();
    }

    const actionValue = adding ? value : (isStack ? values[values.length - 1] : values[0]);
    const actionLabel = operation.charAt(0).toUpperCase() + operation.slice(1);
    const steps = [
      makeStep(values, [], [], { comparisons: 0, operations: 0 }, `Ready to ${operation} ${adding ? actionValue : "the next value"}.`, "start"),
      makeStep(nextValues, adding ? [nextValues.length - 1] : [], [], stats, `${actionLabel} ${actionValue} ${adding ? (isStack ? "onto the top of the stack." : "at the back of the queue.") : (isStack ? "from the top of the stack." : "from the front of the queue.")}`, operation)
    ];
    return {
      category,
      algorithm,
      metadata: definition,
      steps,
      result: {
        values: nextValues,
        removedValue: adding ? null : actionValue,
        comparisons: 0,
        operations: 1
      }
    };
  }

  const working = values.slice();
  const steps = [];
  const stats = { comparisons: 0, operations: 0 };
  const sorted = new Set();
  let foundIndex = -1;
  steps.push(makeStep(working, [], [], stats, "Ready. Start the algorithm or move through the trace one step at a time.", "start"));

  const emit = (active, explanation, action = "compare", pivot = [], snapshot = working) => {
    steps.push(makeStep(snapshot, active, Array.from(sorted).sort((a, b) => a - b), stats, explanation, action, pivot));
  };
  const finishSort = () => {
    for (let index = 0; index < working.length; index += 1) sorted.add(index);
    emit([], "Sorting complete. Every value is now in ascending order.", "complete");
  };

  if (category === "sorting") {
    if (algorithm === "bubble") {
      for (let end = working.length - 1; end > 0; end -= 1) {
        let swapped = false;
        for (let index = 0; index < end; index += 1) {
          stats.comparisons += 1;
          emit([index, index + 1], `Compare ${working[index]} and ${working[index + 1]}.`);
          if (working[index] > working[index + 1]) {
            [working[index], working[index + 1]] = [working[index + 1], working[index]];
            stats.operations += 1;
            swapped = true;
            emit([index, index + 1], `Swap ${working[index + 1]} and ${working[index]} to move the larger value right.`, "swap");
          }
        }
        sorted.add(end);
        if (!swapped) break;
      }
      if (working.length > 0) sorted.add(0);
      finishSort();
    } else if (algorithm === "selection") {
      for (let start = 0; start < working.length; start += 1) {
        let minimum = start;
        for (let index = start + 1; index < working.length; index += 1) {
          stats.comparisons += 1;
          emit([minimum, index], `Compare ${working[minimum]} with ${working[index]} while looking for the smallest remaining value.`);
          if (working[index] < working[minimum]) minimum = index;
        }
        if (minimum !== start) {
          [working[start], working[minimum]] = [working[minimum], working[start]];
          stats.operations += 1;
          emit([start, minimum], `Move the smallest remaining value, ${working[start]}, into position ${start}.`, "swap");
        }
        sorted.add(start);
      }
      finishSort();
    } else if (algorithm === "insertion") {
      for (let index = 1; index < working.length; index += 1) {
        const value = working[index];
        let cursor = index;
        while (cursor > 0) {
          stats.comparisons += 1;
          emit([cursor - 1, cursor], `Compare ${working[cursor - 1]} with ${value} before inserting ${value}.`);
          if (working[cursor - 1] <= value) break;
          working[cursor] = working[cursor - 1];
          stats.operations += 1;
          cursor -= 1;
          emit([cursor, cursor + 1], `Shift ${working[cursor]} one position to the right.`, "move");
        }
        working[cursor] = value;
        if (cursor !== index) {
          stats.operations += 1;
          emit([cursor], `Insert ${value} at position ${cursor}.`, "insert");
        }
        for (let sortedIndex = 0; sortedIndex <= index; sortedIndex += 1) sorted.add(sortedIndex);
      }
      finishSort();
    } else if (algorithm === "merge") {
      const mergeSort = (left, right) => {
        if (right - left < 2) return;
        const middle = Math.floor((left + right) / 2);
        mergeSort(left, middle);
        mergeSort(middle, right);
        const merged = [];
        let first = left;
        let second = middle;
        while (first < middle && second < right) {
          stats.comparisons += 1;
          emit([first, second], `Compare ${working[first]} and ${working[second]} before merging.`);
          if (working[first] <= working[second]) merged.push(working[first++]);
          else merged.push(working[second++]);
        }
        while (first < middle) merged.push(working[first++]);
        while (second < right) merged.push(working[second++]);
        for (let offset = 0; offset < merged.length; offset += 1) {
          working[left + offset] = merged[offset];
          stats.operations += 1;
          emit([left + offset], `Write ${merged[offset]} into position ${left + offset} during merge.`, "write");
        }
      };
      mergeSort(0, working.length);
      finishSort();
    } else {
      const quickSort = (left, right) => {
        if (left >= right) return;
        const pivotValue = working[right];
        let boundary = left;
        for (let index = left; index < right; index += 1) {
          stats.comparisons += 1;
          emit([index, right], `Compare ${working[index]} with pivot ${pivotValue}.`, "compare", [right]);
          if (working[index] <= pivotValue) {
            if (boundary !== index) {
              [working[boundary], working[index]] = [working[index], working[boundary]];
              stats.operations += 1;
              emit([boundary, index], "Move a value no larger than the pivot to its left partition.", "swap", [right]);
            }
            boundary += 1;
          }
        }
        [working[boundary], working[right]] = [working[right], working[boundary]];
        if (boundary !== right) {
          stats.operations += 1;
          emit([boundary, right], `Place pivot ${pivotValue} at its final position.`, "swap", [boundary]);
        } else {
          emit([boundary], `Pivot ${pivotValue} is in its final position.`, "pivot", [boundary]);
        }
        sorted.add(boundary);
        quickSort(left, boundary - 1);
        quickSort(boundary + 1, right);
      };
      quickSort(0, working.length - 1);
      finishSort();
    }
    return {
      category,
      algorithm,
      metadata: definition,
      steps,
      result: { sortedValues: working, comparisons: stats.comparisons, operations: stats.operations }
    };
  }

  if (category === "searching") {
    if (!Number.isInteger(target) || target < -9999 || target > 9999) {
      throw new Error("Target must be an integer between -9999 and 9999.");
    }
    if (algorithm === "binary" && working.some((value, index) => index > 0 && working[index - 1] > value)) {
      throw new Error("Binary search requires values sorted in ascending order.");
    }
    if (algorithm === "linear") {
      for (let index = 0; index < working.length; index += 1) {
        stats.comparisons += 1;
        emit([index], `Compare target ${target} with ${working[index]}.`);
        if (working[index] === target) {
          foundIndex = index;
          emit([index], `Target ${target} found at index ${index}.`, "found");
          break;
        }
      }
    } else {
      let left = 0;
      let right = working.length - 1;
      while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        stats.comparisons += 1;
        emit([middle], `Compare target ${target} with middle value ${working[middle]}.`);
        if (working[middle] === target) {
          foundIndex = middle;
          emit([middle], `Target ${target} found at index ${middle}.`, "found");
          break;
        }
        if (working[middle] < target) left = middle + 1;
        else right = middle - 1;
      }
    }
    if (foundIndex < 0) emit([], `Target ${target} is not present in this array.`, "not-found");
    return { category, algorithm, metadata: definition, steps, result: { foundIndex, comparisons: stats.comparisons, operations: 0 } };
  }

  const structure = [];
  let queueHead = 0;
  steps[0] = makeStep(structure, [], [], stats, "Ready. Add each value to the data structure, then remove values in its natural order.", "start");
  for (const value of values) {
    if (algorithm === "stack") {
      structure.push(value);
      stats.operations += 1;
      emit([structure.length - 1], `Push ${value} onto the top of the stack.`, "push", [], structure);
    } else {
      structure.push(value);
      stats.operations += 1;
      emit([structure.length - 1], `Enqueue ${value} at the back of the queue.`, "enqueue", [], structure);
    }
  }
  while (algorithm === "stack" ? structure.length > 0 : queueHead < structure.length) {
    const value = algorithm === "stack" ? structure.pop() : structure[queueHead++];
    const remaining = algorithm === "stack" ? structure : structure.slice(queueHead);
    stats.operations += 1;
    emit([], algorithm === "stack" ? `Pop ${value} from the top of the stack.` : `Dequeue ${value} from the front of the queue.`, algorithm === "stack" ? "pop" : "dequeue", [], remaining);
  }
  emit([], `${definition.label} operations complete.`, "complete", [], algorithm === "stack" ? structure : structure.slice(queueHead));
  return { category, algorithm, metadata: definition, steps, result: { removedValues: algorithm === "stack" ? values.slice().reverse() : values.slice(), comparisons: 0, operations: stats.operations } };
}

function getCatalog() {
  return catalog.map((item) => ({ ...item }));
}

module.exports = { createTrace, getCatalog };
