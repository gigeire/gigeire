import { supabaseAdmin } from '../src/utils/supabase/admin';

async function backfillMissingUsers() {
    console.log('🚀 Starting backfill process for missing users...');

    // 1. Get all users from auth.users
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Error fetching auth users:', authError.message);
        return;
    }
    if (!authUsers) {
        console.log('No users found in auth.users. Exiting.');
        return;
    }

    const authUserMap = new Map(authUsers.map(u => [u.id, u]));
    console.log(`✅ Found ${authUsers.length} total users in auth.users.`);

    // 2. Get all user IDs from public.users
    const { data: publicUsers, error: publicError } = await supabaseAdmin.from('users').select('id');

    if (publicError) {
        console.error('❌ Error fetching users from public.users:', publicError.message);
        return;
    }

    const publicUserIds = new Set(publicUsers.map(u => u.id));
    console.log(`✅ Found ${publicUsers.length} users in public.users.`);

    // 3. Find the users that are in auth.users but not in public.users
    const missingUsers = authUsers.filter(u => !publicUserIds.has(u.id));

    if (missingUsers.length === 0) {
        console.log('🎉 No missing users to backfill. Database is in sync!');
        return;
    }

    console.log(`🔍 Found ${missingUsers.length} users to backfill.`);

    // 4. Prepare the records for insertion
    const usersToInsert = missingUsers.map(user => ({
        id: user.id,
        email: user.email,
        // Add other default fields if necessary, e.g., plan
        plan: 'free', 
    }));

    // 5. Insert the missing users into public.users
    const { error: insertError } = await supabaseAdmin.from('users').insert(usersToInsert);

    if (insertError) {
        console.error('❌ Failed to insert missing users:', insertError.message);
        console.error('Detail:', insertError.details);
        console.error('Hint:', insertError.hint);
    } else {
        console.log(`✅ Successfully inserted ${usersToInsert.length} missing users.`);
    }

    console.log('🏁 Backfill process finished.');
}

backfillMissingUsers(); 