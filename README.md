# Internet-Technologies

Repository for all the lab works and tasks for my Internet Technologies course.

Topic for all labs: a vehicle dealership (cars and motorcycles).

## Files

- `vehicles.xml` — the dealership data as XML.
- `vehicles.json` — the same data as JSON.
- `xsd/` — XML Schema for `vehicles.xml` (Lab 2).
- `vehicles.schema.json` — JSON Schema (draft-06) for `vehicles.json` (Lab 2).

## Validate

```
xmllint --noout --schema xsd/dealership.xsd vehicles.xml
```
