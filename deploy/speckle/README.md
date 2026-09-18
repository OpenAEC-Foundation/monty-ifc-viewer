# OpenAEC Speckle

Monty uses `https://speckle.open-aec.com`, hosted on the OpenAEC server
(`167.235.54.105`). The Compose project is `/opt/openaec-speckle`.
The original NAS is offline; its projects have been removed from the active
Monty catalog. This deployment contains the user-supplied example only.

## Example

- IFC: `2690_CLT as built.ifc` (IFC2X3), retained under `examples/` on the server.
- SHA-256: `19043600c869857211c91df769a5eb6da0468640d09f0446539d30f8949bb256`.
- Project: `5e0fe816a2`; model: `1e024f2485`; version: `7af331d0be`.
- Object: `6092c069f93aa63dbb900424b3ca8ab2`.
- Viewer: https://monty-ifc-viewer.open-aec.com/demo/pr1
- Speckle: https://speckle.open-aec.com/projects/5e0fe816a2/models/1e024f2485
- Successful IFC import, 390 geometries; browser verified 390 rendered meshes.

The example is public so Monty can load it without a user token. Administration
requires login at https://speckle.open-aec.com/authn/login. The existing account
is `admin@open-aec.com`; the first login opens onboarding, which can be skipped.
No separate Maarten account has been provisioned. Accounts from the offline NAS
are not present on this server. Server registration is invite-only. Administrator credentials
are in `/opt/openaec-speckle/admin-credentials.json`, readable by root only.
Email is disabled; an SMTP service has not been configured.

## Components and persistence

Speckle 2.31.14 includes the API, frontend, ingress, previews, webhooks and IFC
importer. PostgreSQL 16, Valkey 8 and MinIO store state in named Docker volumes.
Images pulled from registries are pinned by digest. MinIO is built from the
upstream `RELEASE.2025-10-15T17-29-55Z` security release because the upstream
Docker Hub image is no longer available. `Minio.Dockerfile` records the build.
No host runtime installation is needed beyond Docker and Compose.

Only ingress (`127.0.0.1:18080`) and S3 (`127.0.0.1:19000`) bind host ports.
Nginx exposes them through HTTPS at `speckle.open-aec.com` and
`speckle-files.open-aec.com`. The existing wildcard certificate covers both.
`dns.php` uses the server's existing TransIP integration, checks existing DNS
records, and adds only these two A records when run with `--apply`.

Compose loads random credentials from `.env` (mode 0600, excluded from Git).
Containers restart automatically. Persistent data survives container recreation
and server restart. Do not use `docker compose down --volumes` unless intending
to permanently delete the data. Backups must include PostgreSQL, MinIO data and
`.env`; this deployment does not configure a scheduled backup service.

```sh
cd /opt/openaec-speckle
docker compose ps
docker compose logs --tail 100 speckle-server ifc-import-service
docker compose up -d
```

## Deployment files

Copy `compose.yml`, `Minio.Dockerfile`, and `nginx.conf` to the server deployment
directory. Preserve `.env`, credentials, examples and volumes on updates.

```sh
cd /opt/openaec-speckle
docker compose config -q
docker compose pull --ignore-buildable
docker compose build minio
docker compose up -d
install -m 644 nginx.conf /etc/nginx/sites-available/speckle.open-aec.com
nginx -t && systemctl reload nginx
```

The Monty frontend is built and deployed by `.github/workflows/live.yml` on
pushes to `main`. `deploy/monty-nginx.conf` routes one-segment client paths to
the landing page and project paths to the viewer. This custom Nginx file is
preserved by the shared deployment workflow.

When changing that config, install it at
`/etc/nginx/sites-available/monty-ifc-viewer.open-aec.com`, run `nginx -t`, and
reload nginx. HTML uses `Cache-Control: no-store`; hashed assets use immutable
caching and return 404 when missing, never the viewer HTML. Browsers that cached
HTML before this policy was deployed need one hard refresh. `npm run test:deployment`
checks the live entry points, asset MIME types, caching and missing-asset responses.
The deployment workflow runs this check after publishing.

For future models, log into Speckle, create a project/model and upload the IFC.
Add its project ID to `src/landing/projects-config.ts`, then build and deploy
Monty. No Speckle access token belongs in the public frontend.

## Verification and existing limitations

- `npm run build` passes (strict TypeScript and Vite production build).
- Background Chrome check loads the project through the landing card, renders
  390 meshes and makes no requests to the old NAS.
- Anonymous GraphQL and object access work for the public example.
- Speckle generated a model preview and successfully completed the IFC job.
- Original and server IFC file checksums match.
- The construction-sequence parser supports IFC `DataObject` property sets and
  direct Revit connector parameters. This example has 388 marked elements,
  386 distinct Marks, 13 Original Types and 11 hundred-number collections.
  IFC metadata is read from the loaded model; Revit parameters use the REST API.
- `npm test` checks both export formats and CLT tag precedence. With `npm run dev`
  running, use `MONTY_BASE_URL=http://127.0.0.1:3052 npm run test:browser` to verify
  playback, stepping, slider selection, Mark/type filters and reset against the
  example project. Set `CHROME_PATH` if Chrome is not `/usr/bin/google-chrome`.
- The existing frontend lockfile reports 14 npm audit findings (6 high,
  8 moderate). Dependency upgrades are outside this server/connection change.

Sources: [Speckle 2.31.14 deployment configuration](https://github.com/specklesystems/speckle-server/blob/2.31.14/docker-compose-speckle.yml),
[MinIO security release](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z).
