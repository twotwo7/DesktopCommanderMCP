# Remote MCP Hub integration

Pinned engine: upstream v0.3.2 (9d5afdf5). All execution tools remain upstream implementations.

Run `dist/index.js` as a persistent stdio MCP child per device. Discover tools using
`tools/list`; forward `tools/call` arguments and results unchanged. Routing,
authentication, idempotency and audit belong to the private Hub repository.

`RDC_CONFIG_DIR` optionally isolates managed-node configuration from existing RDC
installations. With no environment override, upstream configuration is unchanged.
Set `DC_REMOTE_DEVICE=true` and `DESKTOP_COMMANDER_DISABLE_TELEMETRY=1` for managed
nodes. Do not pass Hub tokens or SSH private keys into the engine environment.

Linux runs the same cross-platform engine locally; systemd/Docker administration
uses its native shell. No Windows relay is required. OS privileges remain the
privileges of the service account, independently of tool directory policies.

Engine process sessions are upstream memory state. Do not claim host-reboot
process continuation or replay uncertain side effects after disconnects.

## Runtime dependency maintenance

The managed fork uses patched Zod 4 schemas for argument validation and native
input JSON Schema conversion. PDF operation JSON strings retain their original
parse behavior; unknown top-level parameters still produce corrective warnings.
Runtime dependency audit is separate from the Hub repository's dependency tree.
The Hub runtime compatibility workflow builds and checks this fork on Windows
and Linux, tests native stdio tools and constrained-collection rejection, and
requires a clean production dependency audit. Development/packaging dependencies
remain a separate audit scope; a clean runtime audit does not cover them.
