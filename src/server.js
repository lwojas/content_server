import { createApp } from "./app.js";
import { config } from "./config.js";
import { JsonFileStore } from "./storage/JsonFileStore.js";

const store = new JsonFileStore(config.contentRoot);

const app = createApp({
  store,
});

app.listen(config.port, config.host, () => {
  console.log(
    `Content server listening on http://${config.host}:${config.port}`,
  );

  console.log(`Content storage: ${config.contentRoot}`);
});
