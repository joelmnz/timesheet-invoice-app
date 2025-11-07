# Migration Data Loss Fix - Technical Documentation

## Problem Summary

PR #34 introduced a migration to add invoice status workflow (Draft/Sent/Paid/Cancelled). The migration service was updated to use Drizzle ORM's `migrate()` function, which caused issues for existing databases.

## Root Cause

When the updated migration service ran on existing databases:

1. **Database State**: Tables existed from prior deployment (created via migration 0000)
2. **Missing Tracking**: No `__drizzle_migrations` tracking table existed
3. **Drizzle Behavior**: `migrate()` attempted to apply ALL migrations including 0000
4. **Failure**: Migration 0000 tried to CREATE tables that already existed
5. **Result**: Migration failed, database left in inconsistent state

## Why Data Was "Lost"

Actually, **data was NOT lost** in the strict sense. Instead:
- Migration 0000 failed immediately when trying to CREATE existing tables
- Drizzle threw an error and stopped
- Migration 0001 (which adds `date_sent` column) never executed
- Database remained in old schema, causing application errors
- Users couldn't access invoices due to schema mismatch

## The Fix

Modified `backend/src/services/migrations.ts` to detect and handle this scenario:

```typescript
// 1. Check if tables exist without migration tracking
if (tablesExist && !migrationTrackingExists) {
  // 2. Create migration tracking table
  sqlite.exec(`CREATE TABLE __drizzle_migrations (...)`);
  
  // 3. Mark migration 0000 as already applied
  const stmt = sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)');
  stmt.run('0000_young_madripoor', Date.now());
}

// 4. Now migrate() will only apply migrations 0001+
await migrate(db, { migrationsFolder });
```

## How It Works

### For Fresh Installs
1. No tables exist
2. Migration tracking doesn't exist
3. Drizzle creates tracking table
4. Drizzle applies migrations 0000, 0001, etc. in order
5. All data properly initialized

### For Existing Databases (Fixed)
1. Tables exist from prior deployment
2. No migration tracking exists
3. **FIX**: We manually create tracking table and mark 0000 as applied
4. Drizzle only applies migration 0001 (adding `date_sent` column)
5. Database upgraded safely without errors

## Testing

Created comprehensive test scenarios:

### Test 1: Fresh Database
- Start with no database
- Run migrations
- Verify all tables created
- Verify data can be inserted

### Test 2: Existing Database (Bug Reproduction)
- Create database with old schema (pre-PR #34)
- Call `migrate()` without fix
- **Result**: Migration fails with "table already exists" error

### Test 3: Existing Database (With Fix)
- Create database with old schema
- Apply fix (initialize tracking, mark 0000 as applied)
- Call `migrate()`  
- **Result**: Migration succeeds, all invoice data preserved

## Security Considerations

### SQL Injection Prevention

Initial implementation used string interpolation:
```typescript
// VULNERABLE
sqlite.exec(`INSERT INTO __drizzle_migrations VALUES ('${hash}', ${timestamp})`);
```

Fixed to use parameterized queries:
```typescript
// SAFE
const stmt = sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)');
stmt.run(migration0000Hash, timestamp);
```

### Table Name Interpolation

For checking table existence:
```typescript
// Safe - CORE_TABLES is a controlled constant
const tableCheck = sqlite.query(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name IN ('${CORE_TABLES.join("','")}')
`).all();
```

This is safe because:
- `CORE_TABLES` is a hardcoded constant, not user input
- SQLite doesn't support parameterized table names
- This is the standard approach for dynamic table name queries

## Future Migration Guidelines

To prevent similar issues in the future:

1. **Always Test Migrations** on databases with existing data
2. **Document Schema Assumptions** in migration files
3. **Consider Backwards Compatibility** when changing migration systems
4. **Use Drizzle from Start** to avoid tracking table issues
5. **Backup Before Migrating** in production environments

## Deployment Checklist

When deploying this fix:

- [ ] Backup production database
- [ ] Test migration on copy of production data
- [ ] Verify all invoice data preserved
- [ ] Verify invoice statuses correctly migrated (Unpaid → Sent)
- [ ] Verify new `date_sent` column populated
- [ ] Check application can read/write invoices
- [ ] Monitor logs for migration errors

## Related Files

- `backend/src/services/migrations.ts` - Migration service (fixed)
- `backend/drizzle/0000_young_madripoor.sql` - Initial schema
- `backend/drizzle/0001_secret_rawhide_kid.sql` - Invoice status migration
- `backend/drizzle/meta/_journal.json` - Migration tracking metadata

## References

- PR #34: Invoice Status Workflow Enhancement
- Issue: Loss of data investigation
- Drizzle ORM Migration Documentation
