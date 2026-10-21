const path = require("node:path");
const express = require("express");
const { createTrace, getCatalog } = require("./src/algorithms");

const app = express();
const port = Number(process.env.PORT) || 3000;
const projectRoot = __dirname;

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/algorithms", (_request, response) => {
  response.json({ algorithms: getCatalog() });
});

app.post("/api/visualize", (request, response) => {
  try {
    response.json(createTrace(request.body));
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid visualization request."
    });
  }
});

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

app.get("/", (_request, response) => {
  response.sendFile(path.join(projectRoot, "index.html"));
});

for (const asset of ["app.js", "styles.css", "tailwind.config.js"]) {
  app.get(`/${asset}`, (_request, response) => {
    response.sendFile(path.join(projectRoot, asset));
  });
}

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Request body must be valid JSON." });
  }

  if (error.status === 413) {
    return response.status(413).json({ error: "Request body must not exceed 16 KB." });
  }

  console.error(error);
  return response.status(500).json({ error: "An unexpected server error occurred." });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`AlgoCraft is running at http://localhost:${port}`);
  });
}

module.exports = app;
