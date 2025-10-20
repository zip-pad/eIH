# Supabase Setup Guide for eInformation Hub

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a region close to your users
4. Set a strong database password
5. Wait for project to be ready (2-3 minutes)

## 2. Database Schema

Run this SQL in the Supabase SQL Editor:

```sql
-- Create libraries table
CREATE TABLE libraries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    type TEXT CHECK (type IN ('book', 'paper')) NOT NULL,
    category TEXT,
    year INTEGER,
    publishing_year TEXT,
    status TEXT,
    pages INTEGER,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    language TEXT,
    url TEXT,
    cover_url TEXT,
    cover_image TEXT,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    summary TEXT,
    notes TEXT,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on libraries table
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own libraries
CREATE POLICY "Users can view own libraries" ON libraries
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy: Users can insert their own libraries
CREATE POLICY "Users can insert own libraries" ON libraries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own libraries
CREATE POLICY "Users can update own libraries" ON libraries
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy: Users can delete their own libraries
CREATE POLICY "Users can delete own libraries" ON libraries
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_libraries_user_id ON libraries(user_id);
CREATE INDEX idx_libraries_type ON libraries(type);
CREATE INDEX idx_libraries_category ON libraries(category);
CREATE INDEX idx_libraries_date_added ON libraries(date_added);
```

## 3. Authentication Setup

### ✅ REQUIRED: Email Authentication
**Email authentication is already enabled by default** - you can start using it immediately!

### 🔄 OPTIONAL: Social Login (Can be set up later)
You can add these later when you're ready:

1. **Google OAuth** (Optional):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

2. **GitHub OAuth** (Optional):
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

**💡 You can start with just email authentication and add social login later!**

## 4. Environment Variables

Create a `.env` file in your UI folder:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 5. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## 6. Security Notes

- The `anon` key is safe to use in frontend code
- Row Level Security (RLS) ensures users only see their own data
- Never expose the `service_role` key in frontend code
- All API calls are automatically authenticated via the user's session

## 7. Next Steps

### 🚀 Immediate (Email Auth Only):
1. ✅ Run the SQL query (Step 2)
2. ✅ Get your Supabase URL and anon key
3. ✅ Create `.env` file with your credentials
4. ✅ Install Supabase client: `npm install @supabase/supabase-js`
5. ✅ Update `landing.js` with real Supabase auth calls
6. ✅ Update `script.js` to use Supabase for data storage

### 🔄 Later (When Ready):
1. Set up Google OAuth (Step 3.1)
2. Set up GitHub OAuth (Step 3.2)
3. Add user session management
4. Implement data migration for existing users

**💡 Start with email authentication - it's fully functional and secure!**
