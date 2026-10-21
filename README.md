# AlgoCraft

AlgoCraft is served by a small Express backend that generates bounded, step-by-step traces for sorting, searching, stacks, and queues.

## Run locally

```sh
npm install
npm start
```

Open <http://localhost:3000>. The Sorting view keeps its best, average, and worst time plus space complexity matrix, and shows a live work estimate that updates as the input size changes. The Complexity tab also provides the live summary for other algorithms.

The development server can be started with `npm run dev`; run the automated checks with `npm test`.

## API

- `GET /api/health` returns `{ "status": "ok" }`.
- `GET /api/algorithms` returns the available algorithm IDs and their complexity metadata.
- `POST /api/visualize` generates a trace.

Example sorting request:

```json
{
  "category": "sorting",
  "algorithm": "merge",
  "values": [8, 3, 5, 1]
}
```

The response includes algorithm metadata, a sequence of snapshots with highlighted indices, explanatory text and operation counts, and a final result. Searching requests also require an integer `target`; binary search rejects arrays that are not sorted in ascending order. Values must be integers from -9999 to 9999, and traces are limited to 50 input values.

Available IDs: `bubble`, `selection`, `insertion`, `merge`, `quick`, `linear`, `binary`, `stack`, and `queue`. Use category `datastructures` for the stack and queue IDs.

To perform one stack or queue operation at a time, include `operation` and the current `values` in the request. Stack operations are `push` (also provide `value`) and `pop`; queue operations are `enqueue` (also provide `value`) and `dequeue`. The response returns the updated `result.values`. Removing from an empty structure returns a validation error.
