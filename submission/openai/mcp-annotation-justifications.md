# MCP annotation justifications

These reasons are ready to paste into the OpenAI submission portal. The server declarations already include explicit `readOnlyHint`, `openWorldHint`, and `destructiveHint` values.

| Tool | Read-only | Open-world | Destructive | Justification |
|---|---:|---:|---:|---|
| `search_powers` | true | false | false | Reads the bundled public catalogue and returns ranked metadata. It does not browse, store, mutate, or contact another service. |
| `get_power` | true | false | false | Reads one bundled public catalogue record by id and changes nothing. |
| `get_whats_new` | true | false | false | Reads bundled release metadata and compares semantic versions without external access or mutation. |
| `get_install_help` | true | false | false | Returns static installation and troubleshooting text bundled in the service. |
| `get_product_status` | true | false | false | Returns the service version, health label, and public marketplace URL without mutation or external access. |
| `prepare_feedback` | true | false | false | Validates user-supplied feedback and creates a short-lived signed approval token. It does not persist the feedback or contact another system. |
| `submit_feedback` | false | false | false | Persists only the exact feedback payload previously previewed and approved. It creates a reversible record with a deletion token and does not affect third-party systems. |
| `prepare_power_request` | true | false | false | Validates the requested job and creates a short-lived signed approval token without persisting the request. |
| `submit_power_request` | false | false | false | Persists only the exact request payload previously previewed and approved. It creates a reversible record with a deletion token and does not affect third-party systems. |
| `delete_my_submission` | false | false | true | Permanently deletes the one stored feedback or request record identified by both receipt id and secret deletion token. |

`openWorldHint` is false for every tool because the service reads only its bundled catalogue/release data or its own database. It does not browse the web, query third-party APIs, or act on external systems.
