export const HTTPQL_REFERENCE = `
HTTPQL: filter HTTP requests/responses in Caido.

Syntax: namespace.field.operator:"value"

Namespaces: req, resp, preset, row, source

Fields:
- req: ext (file extension), host, method, path, port, raw, created_at
- resp: code, raw, roundtrip
- row: id

Operators:
- Numbers (port, code, roundtrip, id): eq, gt, gte, lt, lte, ne
- Text/bytes (ext, host, method, path, raw): cont (contains, case-insensitive), eq, like (SQL LIKE), ncont, ne, nlike, regex, nregex
- Dates (created_at): gt (after), lt (before)

Logic: AND (both true, higher priority), OR (either true)

Examples:
req.method.eq:"GET"
req.raw.cont:"Authorization: Bearer"
resp.code.eq:200
req.path.cont:"/api/"
req.host.eq:"example.com" AND resp.code.gt:400
"search term" (searches req.raw & resp.raw)

Special: preset:"name"/alias, source:intercept, replay, automate, workflow
`;
