import express from 'express';
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

const resources = { cars: 'c', motorcycles: 'm' }; // collection name -> id prefix

const app = express();
app.use(express.json());

for (const [name, prefix] of Object.entries(resources)) {
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
    const item = { ...req.body, id: nextId() };
    list().push(item);
    save();
    res.status(201).location(`${base}/${item.id}`).json(item);
  });

  app.put(`${base}/:id`, (req, res) => {
    const i = list().findIndex((v) => v.id === req.params.id);
    if (i < 0) return notFound(res);
    const item = { ...req.body, id: req.params.id }; // the URL decides the id, not the body
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

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`API on http://localhost:${port}/api`));
