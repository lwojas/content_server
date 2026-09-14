import { config } from "../config.js";

const SAFE_NAME = /^[a-zA-Z0-9_-]+$/;

export function validateProject(project) {
  if (!project || !SAFE_NAME.test(project)) {
    const error = new Error(
      "Invalid project name. Use only letters, numbers, '-' and '_'.",
    );

    error.statusCode = 400;

    throw error;
  }

  return project;
}

export function validateDocumentType(type) {
  if (!Object.hasOwn(config.documentTypes, type)) {
    const error = new Error(`Unknown document type '${type}'.`);

    error.statusCode = 404;

    throw error;
  }

  return type;
}

export function validateDocumentName(name) {
  if (!name || !SAFE_NAME.test(name)) {
    const error = new Error(
      "Invalid document name. Use only letters, numbers, '-' and '_'.",
    );

    error.statusCode = 400;

    throw error;
  }

  return name;
}

export function validateDocumentShape(type, data) {
  const expectedShape = config.documentTypes[type].expectedShape;

  if (expectedShape === "array" && !Array.isArray(data)) {
    const error = new Error(`${type} documents must contain a JSON array.`);

    error.statusCode = 400;

    throw error;
  }

  if (
    expectedShape === "object" &&
    (data === null || typeof data !== "object" || Array.isArray(data))
  ) {
    const error = new Error(`${type} documents must contain a JSON object.`);

    error.statusCode = 400;

    throw error;
  }
}
