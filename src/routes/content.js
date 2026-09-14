import express from "express";

import {
  validateDocumentName,
  validateDocumentShape,
  validateDocumentType,
  validateProject,
} from "../utils/validation.js";

export function createContentRouter(store) {
  const router = express.Router();

  /*
   * GET /api/projects
   *
   * Returns the available projects.
   */
  router.get("/projects", async (req, res) => {
    const projects = await store.listProjects();

    res.json({
      projects,
    });
  });

  /*
   * GET /api/projects/:project/:type
   *
   * Returns the available document names.
   *
   * Example:
   *
   * GET /api/projects/raycaster/maps
   *
   * {
   *   "type": "maps",
   *   "documents": [
   *     "testMap",
   *     "arena"
   *   ]
   * }
   */
  router.get("/projects/:project/:type", async (req, res) => {
    const project = validateProject(req.params.project);

    const type = validateDocumentType(req.params.type);

    const documents = await store.listDocuments(project, type);

    res.json({
      project,
      type,
      documents,
    });
  });

  /*
   * GET /api/projects/:project/:type/:name
   *
   * Loads one complete JSON document.
   */
  router.get("/projects/:project/:type/:name", async (req, res) => {
    const project = validateProject(req.params.project);

    const type = validateDocumentType(req.params.type);

    const name = validateDocumentName(req.params.name);

    const document = await store.getDocument(project, type, name);

    if (document === null) {
      res.status(404).json({
        error: "Document not found.",
      });

      return;
    }

    res.json(document);
  });

  /*
   * PUT /api/projects/:project/:type/:name
   *
   * Saves one complete JSON document.
   *
   * The existing editor can simply send its
   * complete document here.
   */
  router.put("/projects/:project/:type/:name", async (req, res) => {
    const project = validateProject(req.params.project);

    const type = validateDocumentType(req.params.type);

    const name = validateDocumentName(req.params.name);

    validateDocumentShape(type, req.body);

    const document = await store.saveDocument(project, type, name, req.body);

    res.json({
      project,
      type,
      name,
      document,
    });
  });

  return router;
}
