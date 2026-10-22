# REST API

The frontend and API share an origin. JSON is returned for all API outcomes. Personal responses use `Cache-Control: no-store`.

| Method | Path             | Behavior                                                |
| ------ | ---------------- | ------------------------------------------------------- |
| GET    | `/api/health`    | Verify the database connection                          |
| POST   | `/api/workspace` | Create or resume a guest workspace and return its notes |
| GET    | `/api/notes`     | List owned active and archived notes                    |
| POST   | `/api/notes`     | Create a note, returning 201                            |
| PUT    | `/api/notes/:id` | Replace owned note fields with a checked version        |
| DELETE | `/api/notes/:id` | Permanently delete an owned note with a checked version |

Writes require `Origin` matching the request URL’s origin, `Content-Type: application/json`, and the HttpOnly session cookie, except that workspace initialization establishes the cookie itself. The frontend sets the content type and browsers send Origin and cookies automatically.

Create payload:

```json
{
  "title": "An idea worth keeping",
  "content": "Write something useful.",
  "tags": ["Personal"],
  "archived": false
}
```

Updates require the same fields plus `"version": 1`. Deletion requires `{"version":1}`. Successful mutations return `{ "note": ... }`, or `{ "deleted": true }` for deletion. Notes include `id`, `createdAt`, `updatedAt`, and `version` in addition to editable fields. Listing returns `{ "notes": [...] }`.

| Status    | Meaning                                                |
| --------- | ------------------------------------------------------ |
| 400       | Malformed JSON or missing body                         |
| 401       | Missing or expired workspace session                   |
| 403       | Cross-origin mutation rejected                         |
| 404       | Unknown endpoint or note unavailable to this workspace |
| 409       | Version conflict or workspace note capacity reached    |
| 413       | Request exceeds 220,000 UTF-8 bytes                    |
| 415       | Non-JSON write request                                 |
| 422       | Field validation failed                                |
| 429       | Workspace or session-creation limit exceeded           |
| 500 / 503 | Internal operation or database availability failure    |

Field limits: title 1–120 trimmed characters; content at most 50,000 characters; at most 12 nonempty tags, each at most 24 characters. Tags are deduplicated case-insensitively. Unknown fields are rejected. Per-workspace requests are limited to 180 per minute. New workspaces are limited to 30 per IP per hour. `Retry-After: 60` is conservative guidance; an exhausted session-creation window can require waiting longer.
