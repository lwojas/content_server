# Raycaster Content Server

A small, standalone content server for the raycaster game project.

The server provides a shared HTTP API for game-authored content such as:

- Maps
- Entity datasets
- Project metadata

It is intended to be used by multiple clients, including:

- The React/Vite map editor
- The game runtime
- The runtime launcher
- Future content/configuration tools

The server deliberately separates **content access** from the game engine and editor implementation.

---

## Purpose

Previously, authored game content existed primarily as JSON files inside the game repository.

The editor accessed those files through Vite middleware, while the runtime used generated JavaScript registries.

The content server replaces that split access model with a shared API:

```text
                 ┌─────────────────┐
                 │                 │
                 │  React Editor   │
                 │                 │
                 └────────┬────────┘
                          │
                          │ HTTP
                          ▼
                 ┌─────────────────┐
                 │                 │
                 │ Content Server  │
                 │                 │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │                 │
                 │ File Content    │
                 │ Store           │
                 │                 │
                 └────────┬────────┘
                          │
                          ▼
                     JSON files
                          ▲
                          │
                 ┌────────┴────────┐
                 │                 │
                 │ Game Runtime    │
                 │ / Launcher      │
                 │                 │
                 └─────────────────┘
```

The editor and runtime should interact with content through a client/API abstraction rather than directly depending on the filesystem.

---

# Design Principles

## 1. The server is a content boundary

The server is responsible for:

- Listing content
- Reading content
- Saving content
- Providing project-based organisation
- Persisting authored JSON data

The server is **not** responsible for:

- Running the game
- Creating ECS worlds
- Running systems
- Resolving gameplay rules
- Managing runtime state
- Spawning entities
- Rendering

Game logic remains inside the game engine/runtime.

---

## 2. Content is plain JSON

Authored content remains plain JSON.

For example:

```text
projects/
└── raycaster/
    ├── project.json
    │
    ├── maps/
    │   ├── arena.json
    │   └── sulaco.json
    │
    └── entity-datasets/
        ├── arenaEntities.json
        └── utEnemies.json
```

The server does not convert JSON into JavaScript modules.

Clients receive plain serializable data.

---

## 3. Storage is abstracted

HTTP routes should not directly depend on filesystem implementation details.

The architecture is:

```text
HTTP API
   │
   ▼
Content Store Interface
   │
   ▼
Storage Implementation
```

The current implementation uses:

```text
FileContentStore
```

which persists JSON documents to disk.

Future implementations could include:

```text
MongoContentStore
DatabaseContentStore
RemoteContentStore
GitContentStore
```

without requiring API consumers to change.

---

## 4. Projects own content

Content is grouped by project.

API structure:

```text
/api/projects/:projectId/...
```

Filesystem structure:

```text
projects/:projectId/...
```

For example:

```text
projects/raycaster/maps/sulaco.json
```

This allows the server to support multiple games or content projects in the future.

---

# API

## Health

### `GET /health`

Returns the server health status.

Example:

```bash
curl http://localhost:4000/health
```

Response:

```json
{
  "ok": true
}
```

---

# Projects

## List projects

### `GET /api/projects`

Example:

```bash
curl http://localhost:4000/api/projects
```

Response:

```json
["raycaster"]
```

---

## Get project

### `GET /api/projects/:projectId`

Example:

```bash
curl http://localhost:4000/api/projects/raycaster
```

Response:

```json
{
  "id": "raycaster",
  "name": "Raycaster Game"
}
```

---

# Maps

## List maps

### `GET /api/projects/:projectId/maps`

Example:

```bash
curl \
  http://localhost:4000/api/projects/raycaster/maps
```

Response:

```json
["arena", "sulaco"]
```

The response contains document IDs, not the full map data.

---

## Get a map

### `GET /api/projects/:projectId/maps/:mapId`

Example:

```bash
curl \
  http://localhost:4000/api/projects/raycaster/maps/sulaco
```

Response:

```json
{
  "name": "Sulaco",
  "width": 10,
  "height": 10,
  "cells": []
}
```

---

## Save a map

### `PUT /api/projects/:projectId/maps/:mapId`

Example:

```bash
curl -X PUT \
  http://localhost:4000/api/projects/raycaster/maps/test-map \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Map",
    "width": 10,
    "height": 10,
    "cells": []
  }'
```

Response:

```json
{
  "ok": true
}
```

This creates or replaces:

```text
projects/raycaster/maps/test-map.json
```

---

# Entity Datasets

Entity datasets are authored collections of entities associated with a game scenario, map, or configuration.

The server treats them as plain JSON documents.

---

## List entity datasets

### `GET /api/projects/:projectId/entity-datasets`

Example:

```bash
curl \
  http://localhost:4000/api/projects/raycaster/entity-datasets
```

Response:

```json
["arenaEntities", "utEnemies"]
```

---

## Get an entity dataset

### `GET /api/projects/:projectId/entity-datasets/:datasetId`

Example:

```bash
curl \
  http://localhost:4000/api/projects/raycaster/entity-datasets/utEnemies
```

Response:

```json
[
  {
    "uniqueId": "enemy-1",
    "prefab": "enemy"
  }
]
```

---

## Save an entity dataset

### `PUT /api/projects/:projectId/entity-datasets/:datasetId`

Example:

```bash
curl -X PUT \
  http://localhost:4000/api/projects/raycaster/entity-datasets/test-enemies \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uniqueId": "enemy-1",
      "prefab": "enemy"
    }
  ]'
```

Response:

```json
{
  "ok": true
}
```

---

# Storage

## Content Store

The server depends on a content store abstraction.

Conceptually:

```js
store.listProjects();

store.getProject(projectId);

store.listMaps(projectId);
store.getMap(projectId, mapId);
store.saveMap(projectId, mapId, data);

store.listEntityDatasets(projectId);
store.getEntityDataset(projectId, datasetId);
store.saveEntityDataset(projectId, datasetId, data);
```

HTTP routes should communicate with the store rather than directly accessing the filesystem.

---

## FileContentStore

The current storage implementation is:

```text
FileContentStore
```

It stores content as JSON files:

```text
data/
└── projects/
    └── raycaster/
        ├── project.json
        │
        ├── maps/
        │   ├── arena.json
        │   └── sulaco.json
        │
        └── entity-datasets/
            ├── arenaEntities.json
            └── utEnemies.json
```

---

## Atomic writes

JSON files should be written atomically.

The storage implementation writes to a temporary file:

```text
map.json.tmp
```

and then renames it to:

```text
map.json
```

This prevents readers from seeing partially written JSON documents.

---

# IDs and filenames

Project IDs and document IDs are used as filesystem names.

For safety, IDs must match:

```text
[a-zA-Z0-9_-]+
```

Examples of valid IDs:

```text
raycaster
test-map
utEnemies
arena_01
```

Invalid IDs include path separators and special characters.

This prevents path traversal and ambiguous filesystem paths.

---

# Running Locally

Requirements:

```text
Node.js 20+
```

Install:

```bash
npm install
```

Start:

```bash
npm start
```

The server starts on:

```text
http://localhost:4000
```

Development mode:

```bash
npm run dev
```

---

# Environment Variables

## `PORT`

The HTTP port.

Default:

```text
4000
```

Example:

```bash
PORT=5000 npm start
```

---

## `HOST`

The host interface.

Default:

```text
0.0.0.0
```

This allows the server to be accessed from other devices on the local network when appropriate.

---

## `DATA_DIR`

The root directory containing content.

Default:

```text
./data
```

Example:

```bash
DATA_DIR=/opt/raycaster-content npm start
```

The expected project structure inside this directory is:

```text
DATA_DIR/
└── projects/
    └── :projectId/
```

---

# Docker

The server is designed to run in a Docker container.

The application container should remain stateless.

Persistent game content should be mounted from outside the container.

Example:

```text
Homelab
│
├── raycaster-content-server/
│   └── Docker application
│
└── raycaster-content/
    └── persistent JSON content
```

Example volume mount:

```yaml
volumes:
  - /opt/raycaster-content:/app/data
```

This ensures that:

- Content survives container rebuilds
- Content is independent from server deployment
- Content can be backed up separately
- Content can later be managed with Git

---

# Deployment Model

The recommended deployment model separates:

## Server application

Stored in its own Git repository:

```text
raycaster-content-server
```

Contains:

```text
src/
package.json
Dockerfile
docker-compose.yml
README.md
```

The server repository contains application code only.

---

## Game content

Stored outside the container as persistent data:

```text
/opt/raycaster-content
```

Example:

```text
/opt/raycaster-content/
└── projects/
    └── raycaster/
        ├── project.json
        ├── maps/
        └── entity-datasets/
```

The content directory should not be destroyed or replaced when deploying a new server image.

---

# Clients

The content server is intended to be accessed through a content client abstraction.

Conceptually:

```text
Editor
   │
   ├──────┐
   │      │
Runtime   │
   │      │
Launcher  │
   │      │
   ▼      ▼
Content Client
       │
       ▼
HTTP Content API
```

Clients should ideally not depend directly on:

- Filesystem paths
- Docker paths
- Storage implementation
- Generated JavaScript registries

Instead they should depend on an API/client interface.

For example:

```js
const maps = await content.maps.list();

const map = await content.maps.get("sulaco");

await content.maps.save("sulaco", mapData);
```

The exact client implementation may later change without requiring editor, launcher, or runtime systems to change.

---

# Runtime Usage

The content server is intended to provide authored content during application startup or session creation.

Recommended flow:

```text
Launcher
   │
   ▼
Select map
   │
   ▼
ContentClient.getMap()
   │
   ▼
Plain map JSON
   │
   ▼
Create GameSession
   │
   ▼
Build ECS world
   │
   ▼
Run game
```

The game engine should work with already-resolved plain data.

The ECS systems should not perform HTTP requests during gameplay.

Avoid patterns such as:

```text
MovementSystem
   │
   ▼
HTTP request
```

or:

```text
EntitySpawner
   │
   ▼
Fetch content from server
```

The content API is an authoring and loading boundary, not a runtime dependency inside the ECS loop.

---

# Testing

Basic health check:

```bash
curl http://localhost:4000/health
```

List projects:

```bash
curl http://localhost:4000/api/projects
```

Save a test map:

```bash
curl -X PUT \
  http://localhost:4000/api/projects/raycaster/maps/test-map \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Map",
    "width": 10,
    "height": 10,
    "cells": []
  }'
```

List maps:

```bash
curl \
  http://localhost:4000/api/projects/raycaster/maps
```

Get the map:

```bash
curl \
  http://localhost:4000/api/projects/raycaster/maps/test-map
```

This validates the core flow:

```text
HTTP
  ↓
Content API
  ↓
Content Store
  ↓
JSON file
  ↓
Content Store
  ↓
HTTP response
```

---

# Future Extensions

Possible future additions include:

- Content validation
- Schemas
- DELETE endpoints
- Project creation
- Project metadata updates
- Content revision/versioning
- Automatic backups
- Git-backed content storage
- Authentication
- Multiple users
- Concurrent editing support
- Database-backed storage
- MongoDB storage implementation
- Content metadata
- Search/filtering
- Tags
- Content relationships
- Revision history

These should only be added when there is a concrete requirement.

The current server intentionally keeps the architecture small.

---

# Architecture Summary

```text
              Editor
                │
                │
                ▼
        ┌─────────────────┐
        │ Content Client  │
        └────────┬────────┘
                 │
                 │ HTTP
                 ▼
        ┌─────────────────┐
        │ Content Server  │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Content Store   │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ JSON Files      │
        └─────────────────┘
                 ▲
                 │
                 │
        ┌────────┴────────┐
        │ Content Client  │
        └────────┬────────┘
                 │
                 ▼
          Game Runtime
```

The central principle is:

> **Authored game content is plain data. The editor and runtime access that data through a stable content interface. Storage and transport can change independently of the game systems.**

---

# AI Agent Notes

When modifying this project, preserve these architectural boundaries:

1. **Do not add game logic to the content server.**
2. **Do not make ECS systems depend on HTTP.**
3. **Keep authored content serializable JSON.**
4. **Keep storage behind the `ContentStore` abstraction.**
5. **Do not couple API consumers directly to filesystem paths.**
6. **Prefer extending the existing project/content model over adding unrelated services.**
7. **Avoid introducing databases or infrastructure without a concrete requirement.**
8. **Persistent content must survive Docker container rebuilds.**
9. **Server code and authored game content should remain independently deployable.**
10. **Keep the API simple and predictable.**

The content server should remain a small, boring infrastructure component that provides a stable boundary between authored game data and the applications that consume it.
