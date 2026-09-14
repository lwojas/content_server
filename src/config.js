import path from "node:path";

const port = Number.parseInt(process.env.PORT || "4000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

export const config = {
  port,

  host: process.env.HOST || "0.0.0.0",

  // In Docker this will normally be /data.
  // Locally it defaults to ./data.
  contentRoot: path.resolve(process.env.CONTENT_ROOT || "./data"),

  // Keep this deliberately small and explicit.
  documentTypes: {
    templates: {
      expectedShape: "object",
    },

    entities: {
      expectedShape: "array",
    },

    maps: {
      expectedShape: "object",
    },
  },
};
