import express from 'express';
import Ajv from 'ajv';
import draft06 from 'ajv/dist/refs/json-schema-draft-06.json' with { type: 'json' };
import { readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs';

// Working copy of the data, so the Lab 2 vehicles.json stays untouched. Delete db.json to reset.
const DB = new URL('./db.json', import.meta.url);
const DB_TMP = new URL('./db.json.tmp', import.meta.url);
if (!existsSync(DB)) copyFileSync(new URL('../vehicles.json', import.meta.url), DB);
const db = JSON.parse(readFileSync(DB)).dealership;

// Write to a temp file and rename it, so a crash mid-write cannot corrupt db.json.
function save() {
  writeFileSync(DB_TMP, JSON.stringify({ dealership: db }, null, 2));
  renameSync(DB_TMP, DB);
}

// Lab 2 JSON Schema is draft-06; one item is checked against its car/motorcycle definition.
const schema = JSON.parse(readFileSync(new URL('../vehicles.schema.json', import.meta.url)));
const ajv = new Ajv({ allErrors: true, strictTypes: false }); // types come from the allOf base, which strict mode can't see
ajv.addMetaSchema(draft06);
ajv.addSchema(schema);
const definition = (name) => ajv.getSchema(`${schema.$id}#/definitions/${name}`);

// collection name -> id prefix and validator
const resources = {
  cars: { prefix: 'c', validate: definition('car') },
  motorcycles: { prefix: 'm', validate: definition('motorcycle') },
};

// Returns 400 with one entry per broken field, e.g. { field: "/price/value", message: "must be > 0" }.
function invalid(validate, item, res) {
  if (validate(item)) return false;
  const details = validate.errors.map((e) => ({
    field: e.instancePath + (e.params.missingProperty ? `/${e.params.missingProperty}` : ''),
    message: e.message,
  }));
  res.status(400).json({ error: 'Validation failed', details });
  return true;
}

const app = express();

// The API only speaks JSON: 406 if the client won't accept it, 415 if it sends something else.
app.use('/api', (req, res, next) => {
  if (!req.accepts('json')) return res.status(406).json({ error: 'Only application/json responses are available' });
  if (['POST', 'PUT'].includes(req.method) && !req.is('json'))
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  next();
});
app.use(express.json());

for (const [name, { prefix, validate }] of Object.entries(resources)) {
  const base = `/api/${name}`;
  const list = () => (db[name] ??= []);
  const notFound = (res) => res.status(404).json({ error: `${name} item not found` });
  const nextId = () => prefix + (Math.max(0, ...list().map((v) => Number(v.id.slice(1)))) + 1);

  app.get(base, (req, res) => res.json(list()));

  app.get(`${base}/:id`, (req, res) => {
    const item = list().find((v) => v.id === req.params.id);
    item ? res.json(item) : notFound(res);
  });

  app.post(base, (req, res) => {
    const item = { ...req.body, id: nextId() }; // id is assigned before validation, the schema requires it
    if (invalid(validate, item, res)) return;
    list().push(item);
    save();
    res.status(201).location(`${base}/${item.id}`).json(item);
  });

  app.put(`${base}/:id`, (req, res) => {
    const i = list().findIndex((v) => v.id === req.params.id);
    if (i < 0) return notFound(res);
    const item = { ...req.body, id: req.params.id }; // the URL decides the id, not the body
    if (invalid(validate, item, res)) return;
    list()[i] = item;
    save();
    res.json(item);
  });

  app.delete(`${base}/:id`, (req, res) => {
    const i = list().findIndex((v) => v.id === req.params.id);
    if (i < 0) return notFound(res);
    list().splice(i, 1);
    save();
    res.status(204).end();
  });
}

// Errors as JSON instead of Express's HTML page; malformed JSON bodies arrive here as 400.
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).json({ error: err.expose ? err.message : 'Internal server error' });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`API on http://localhost:${port}/api`));
