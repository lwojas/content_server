import express from "express";
import cors from "cors";

import { JsonFileStore } from "./storage/JsonFileStore.js";
import { createContentRouter } from "./routes/content.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp({ store = new JsonFileStore() } = {}) {
  const app = express();

  /*
   * The editor runs separately from the content server,
   * so allow cross-origin requests.
   *
   * This can be tightened later when the editor is deployed
   * from a known origin.
   */
  app.use(cors());

  app.use(
    express.json({
      limit: "10mb",
    }),
  );

  /*
   * Basic health endpoint.
   */
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
    });
  });

  /*
   * Content API.
   */
  app.use("/api", createContentRouter(store));

  /*
   * Error handling must be last.
   */
  app.use(errorHandler);

  return app;
}
