# Timestamp Migration Guide

This guide covers the steps to migrate the application's timestamp fields from Date objects to epoch-based timestamps (milliseconds since Unix epoch) for more reliable and precise time-based sorting in MongoDB.

## Background

Previously, our application stored timestamp fields (`created_at`, `updated_at`, `sent_at`, etc.) as MongoDB Date objects. While these work in most cases, they can sometimes lead to inconsistent sorting behavior, especially when sorting needs to account for millisecond-level precision.

By storing timestamps as epoch numbers (milliseconds since Unix epoch), we can ensure more reliable and precise sorting of records in MongoDB.

## Migration Steps

Follow these steps to migrate your existing data and implement the new timestamp approach:

### 1. Backup Your Database

**IMPORTANT:** Before proceeding, create a backup of your MongoDB database.

```bash
# Example backup command (adjust URI and path as needed)
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/email_automation" --out=./backup_$(date +%Y%m%d)
```

### 2. Run the Migration Script

The migration script will convert all Date objects in your database to epoch timestamps:

```bash
# Make sure you're in the project root directory
cd backend-mean

# Run the migration script
npm run migrate-timestamps
```

This script:
- Processes all records in the `job_applications` collection
- Processes all records in the `follow_ups` collection
- Converts all date fields to milliseconds since epoch (numeric timestamps)
- Adds appropriate indexes for optimized sorting

### 3. Verify the Migration

You can run a test script to verify that the timestamp-based sorting works as expected:

```bash
npm run test-timestamps
```

This creates test records with various timestamps and demonstrates sorting by different timestamp fields.

### 4. Restart the Application

After migration, restart your application to ensure all changes take effect:

```bash
npm run dev
```

## Technical Details

### Schema Changes

The following changes were made to the schema definitions:

1. Changed the type of all date fields from `Date` to `Number`:
   - `created_at`
   - `updated_at`
   - `sent_at`
   - `follow_up_settings.last_follow_up_date`
   - `follow_up_settings.next_follow_up_date`

2. Updated default values from `Date.now` to `() => Date.now()` (to get milliseconds)

3. Added appropriate indexes for all timestamp fields to optimize sorting operations

### Code Changes

1. Updated model definitions with appropriate types and defaults
2. Modified controllers to store `Date.now()` instead of `new Date()`
3. Created migration script to convert existing records
4. Added indexes for better sorting performance

## Troubleshooting

If you encounter issues after migration:

### Records Not Appearing in Expected Order

- Verify that the timestamp fields contain numeric values (not Date objects)
- Check query sorts are using the correct field name and sort order
- Ensure indexes exist for the fields being sorted

### Migration Script Errors

If the migration script fails:
- Check MongoDB connection settings
- Ensure you have proper permissions
- Review error messages for specific issues
- Try running the script again (it's designed to be idempotent)

#### MongoDB Path Conflict Error

If you see an error like:
```
MongoServerError: Updating the path 'follow_up_settings.last_follow_up_date' would create a conflict at 'follow_up_settings'
```

This occurs when trying to update both a nested object and its fields in the same operation. The fix is to:
1. Separate the updates into two operations
2. Handle the nested updates separately from the parent object updates
3. Run the updated migration script

## Support

If you encounter any issues with the migration, please contact the development team. 