# Remote D1 reconciliation

The known remote database may contain tables created by an older runtime initializer without a matching Wrangler migration ledger. Applying the initial migration blindly could fail or, worse, leave an uncertain production schema. Treat this as a reconciliation task, not a normal migration run.

## Non-destructive inspection

After authenticating to the business-owned Cloudflare account and confirming the database binding, build the release and export both data and schema:

```powershell
New-Item -ItemType Directory -Path backups -Force
npx wrangler d1 export DB --remote --output backups/deaf-shark-prelaunch.sql -c dist/server/wrangler.json
npx wrangler d1 export DB --remote --output backups/deaf-shark-prelaunch-schema.sql --no-data -c dist/server/wrangler.json
npx wrangler d1 migrations list DB --remote -c dist/server/wrangler.json
npx wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name" -c dist/server/wrangler.json
```

Store backups in an access-controlled location outside version control. Confirm the files are non-empty before any write.

## Decision path

- Empty/non-production database: apply all repository migrations normally.
- Existing tables with a complete, matching migration ledger: review and apply only pending migrations.
- Existing tables with no or incomplete ledger: stop. Compare the exported schema with every SQL file in `drizzle/`. Do not replay `0000` over existing tables and do not manually mark migrations applied until every table, column, index, default, and seed row has been verified.
- Production data with a schema mismatch: prepare a new idempotent reconciliation migration or migrate into a fresh D1 database, test on a copy, and obtain owner approval before changing production.

## Evidence to retain

- database ID and account selected;
- timestamped schema/data exports;
- migration-list output before and after;
- schema comparison notes;
- exact release commit and migration files applied;
- smoke-test results and the operator who approved the change.

Database rollback is separate from Worker rollback. Never assume rolling back code reverses a schema or data change.

