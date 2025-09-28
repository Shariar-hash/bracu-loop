# Real-time Setup Instructions

After setting up your database schema, you need to enable real-time subscriptions for live updates.

## Enable Real-time in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **API** > **Realtime**
3. Find the tables and enable real-time for:
   - `public.faculty_reviews`
   - `public.review_votes`

## Alternative: Enable via SQL

Run these commands in your Supabase SQL editor:

```sql
-- Enable real-time for reviews table
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_reviews;

-- Enable real-time for votes table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_votes;
```

## Test Real-time

Once enabled, you should see:
- ✅ **"Review submitted successfully!"** toast notifications
- ✅ **Real-time updates** when others post reviews
- ✅ **Live vote updates** when users upvote/downvote
- ✅ **Instant reply notifications** when new replies are posted

## Troubleshooting

If real-time isn't working:

1. **Check subscription status**: Look for "Real-time update received" in browser console
2. **Verify table permissions**: Ensure RLS policies allow read access
3. **Test connection**: Try refreshing the page and posting a test review
4. **Check Supabase logs**: Look for any real-time related errors in dashboard

The application will still work without real-time - you'll just need to refresh to see new content.
