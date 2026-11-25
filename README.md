# Internet-Technologies

Repository for all the lab works and tasks for my Internet Technologies course.

Topic for all labs: a vehicle dealership (cars and motorcycles).

## Files

- `vehicles.xml` — the dealership data as XML.
- `vehicles.json` — the same data as JSON.
- `xsd/` — XML Schema for `vehicles.xml` (Lab 2).
- `vehicles.schema.json` — JSON Schema (draft-06) for `vehicles.json` (Lab 2).
- `server/` — REST API for the dealership data (Lab 3).

## Validate

```
xmllint --noout --schema xsd/dealership.xsd vehicles.xml
```

## REST API (Lab 3)

```
cd server && npm install && npm start   # http://localhost:3000/api
```

Data is stored in `server/db.json`, copied from `vehicles.json` on first start. Delete it to reset.

| Method | URL | Success | Errors |
|--------|-----|---------|--------|
| GET | `/api/cars` | 200 list | |
| GET | `/api/cars/:id` | 200 item | 404 |
| POST | `/api/cars` | 201 + `Location` | 400, 415 |
| PUT | `/api/cars/:id` | 200 item | 400, 404, 415 |
| DELETE | `/api/cars/:id` | 204 | 404 |

The same routes exist for `/api/motorcycles`. Any route returns 406 if the client does not accept JSON.
POST and PUT bodies are validated against `vehicles.schema.json`. The server assigns the id.
A 400 response lists every broken field:

```json
{ "error": "Validation failed", "details": [{ "field": "/price/value", "message": "must be > 0" }] }
```

Examples:

```
curl localhost:3000/api/cars
curl -X POST localhost:3000/api/motorcycles -H 'Content-Type: application/json' -d @new.json
curl -X PUT localhost:3000/api/cars/c1 -H 'Content-Type: application/json' -d @car.json
curl -X DELETE localhost:3000/api/cars/c2
curl -X POST localhost:3000/api/cars -H 'Content-Type: application/json' -d '{"make":""}'   # 400
```
