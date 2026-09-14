# Raycaster Content Server

A small Node.js HTTP service for storing and serving the raycaster project's authored JSON content.

The server provides a stable API between content tools and the underlying storage. Clients do not need to know where JSON files are stored or how they are persisted.

The initial implementation uses the filesystem and JSON files. The storage layer is isolated behind `ContentStore`, so the backing store can be replaced later without changing the HTTP API.

## Run it

### Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

The server listens on:

```text
http://localhost:4000
```

The default host is `0.0.0.0`, so the server is also accessible from other machines on the local network.

For example:

```text
http://lynn2:4000
```

### Production

```bash
npm start
```

The server can also be run with Docker Compose.

```bash
docker compose up -d
```

The Docker configuration exposes port `4000` and stores content under:

```text
/opt/raycaster-content
```

on the host.

## Configuration

The server supports the following environment variables:

| Variable   | Default   | Description                       |
| ---------- | --------- | --------------------------------- |
| `HOST`     | `0.0.0.0` | Network interface to bind to      |
| `PORT`     | `4000`    | HTTP port                         |
| `DATA_DIR` | `../data` | Root directory for stored content |

For Docker, `DATA_DIR` is set to:

```text
/app/data
```

with the host directory mounted at:

```text
/opt/raycaster-content
```

## Project structure

Content is grouped by project:

```text
data/
└── projects/
    └── raycaster/
        ├── project.json
        ├── maps/
        ├── entity-datasets/
        └── templates/
```

A project contains three independent document collections:

### Maps

```text
maps/
├── testMap.json
├── arena.json
└── ...
```

A map contains the authored map data including its grid, cells, spawn points, spawn zones, and other map properties.

### Entity datasets

```text
entity-datasets/
├── testEntities.json
├── arenaEntities.json
└── ...
```

An entity dataset contains an array of authored entities.

### Templates

```text
templates/
├── alien.json
├── marine.json
└── ...
```

A template document contains the authored entity template definitions.

The server deliberately does **not** interpret or validate these document structures. They are opaque JSON documents from the server's perspective.

This keeps the content service independent from the game engine and allows the document schemas to evolve without requiring corresponding server changes.

## API

### Health

```http
GET /health
```

Returns:

```json
{
  "ok": true
}
```

### Projects

List projects:

```http
GET /api/projects
```

Example response:

```json
["raycaster"]
```

Get project metadata:

```http
GET /api/projects/:projectId
```

Example:

```http
GET /api/projects/raycaster
```

Example response:

```json
{
  "id": "raycaster",
  "name": "Raycaster"
}
```

### Maps

List maps:

```http
GET /api/projects/:projectId/maps
```

Get a map:

```http
GET /api/projects/:projectId/maps/:mapId
```

Save a map:

```http
PUT /api/projects/:projectId/maps/:mapId
Content-Type: application/json
```

The request body is the complete map JSON document.

### Entity datasets

List entity datasets:

```http
GET /api/projects/:projectId/entity-datasets
```

Get an entity dataset:

```http
GET /api/projects/:projectId/entity-datasets/:datasetId
```

Save an entity dataset:

```http
PUT /api/projects/:projectId/entity-datasets/:datasetId
Content-Type: application/json
```

The request body is the complete entity dataset JSON document.

### Templates

List templates:

```http
GET /api/projects/:projectId/templates
```

Get a template:

```http
GET /api/projects/:projectId/templates/:templateId
```

Save a template:

```http
PUT /api/projects/:projectId/templates/:templateId
Content-Type: application/json
```

The request body is the complete template JSON document.

## Example requests

List maps:

```bash
curl http://localhost:4000/api/projects/raycaster/maps
```

Load a map:

```bash
curl http://localhost:4000/api/projects/raycaster/maps/testMap
```

Save a map:

```bash
curl \
  -X PUT \
  -H "Content-Type: application/json" \
  --data @testMap.json \
  http://localhost:4000/api/projects/raycaster/maps/testMap
```

List templates:

```bash
curl http://localhost:4000/api/projects/raycaster/templates
```

## Storage

The current implementation is filesystem-backed.

JSON documents are stored directly under the project directory:

```text
projects/
└── raycaster/
    ├── project.json
    ├── maps/
    │   └── testMap.json
    ├── entity-datasets/
    │   └── testEntities.json
    └── templates/
        └── alien.json
```

Writes use a temporary file followed by an atomic rename. This avoids leaving a partially-written JSON document if the process is interrupted during a save.

Document and project IDs are restricted to:

```text
[a-zA-Z0-9_-]
```

This prevents IDs from being used for path traversal.

## Architecture

The server has three main layers:

```text
HTTP API
   │
   ▼
server.js
   │
   ▼
ContentStore
   │
   ▼
FileContentStore
   │
   ▼
JSON files
```

`ContentStore` defines the storage interface.

`FileContentStore` provides the current filesystem implementation.

`server.js` handles HTTP, routing, JSON requests, CORS, and error responses but does not directly manipulate content files.

This separation is intentional.

If the storage requirements change later, a different implementation can be added without changing the API:

```text
                 ┌── FileContentStore
HTTP API → ContentStore
                 ├── MongoContentStore
                 ├── SqliteContentStore
                 └── ...
```

There is no need to introduce a database until the actual requirements justify one.

## Clients

The primary client is the ECS3D Map Editor.

The editor should communicate with the server through a small content client rather than making HTTP requests throughout the React application.

Conceptually:

```text
Editor
  │
  ▼
content client
  │
  ▼
Content Server
  │
  ▼
JSON files
```

The editor exposes operations such as:

```js
content.maps.list();
content.maps.get(name);
content.maps.save(name, data);

content.entities.list();
content.entities.get(name);
content.entities.save(name, data);

content.templates.list();
content.templates.get(name);
content.templates.save(name, data);
```

The editor therefore does not need to know whether the content is stored locally, on another machine, or in a future database implementation.

## CORS

The server currently allows cross-origin requests:

```text
Access-Control-Allow-Origin: *
```

This is intentional because the editor may run from a different origin, for example:

```text
Editor:
http://localhost:5183

Content server:
http://lynn2:4000
```

The content server is intended for the trusted local development/LAN environment.

It should not be exposed directly to the public internet without adding appropriate authentication, authorization, and network restrictions.

## Responsibilities

The content server is deliberately narrow.

It is responsible for:

- storing authored JSON
- loading authored JSON
- listing available documents
- grouping documents by project
- providing a stable HTTP API
- protecting filesystem paths from traversal
- performing atomic JSON writes

It is **not** responsible for:

- validating game-specific schemas
- running game logic
- compiling game data
- knowing about ECS components
- knowing about Phaser
- rendering maps
- editing documents
- generating runtime JavaScript
- deciding whether content is valid for a particular game mode

Those responsibilities belong to the clients or game tooling.

## Current project relationship

The original editor stored JSON directly inside the raycaster repository:

```text
raycaster/
└── scripts/
    └── data/
        ├── maps/
        ├── entities/
        └── templates/
```

The content server moves that persistence responsibility out of the editor:

```text
raycaster-content-server/
└── data/
    └── projects/
        └── raycaster/
            ├── maps/
            ├── entity-datasets/
            └── templates/
```

This allows multiple clients to work with the same content.

For example:

```text
MacBook
  └── ECS3D Map Editor
          │
          │ HTTP
          ▼
       lynn2
          │
          ▼
  Raycaster Content Server
          │
          ▼
       JSON files
          ▲
          │
          │ HTTP
          │
Son's PC / other editor
```

The editor and content server can therefore be developed and deployed independently.
