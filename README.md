# HEXPlore

A modern hex editor in the browser with real-time collaboration features.

## Features

- 🔍 View files in hexadecimal, binary, and ASCII formats
- 💬 Add and share comments on specific byte ranges
- 🔗 Share files with others
- 👥 Real-time comment updates
- 🎨 Modern, responsive UI
- 🔒 User authentication
- 📱 Mobile-friendly design

## Tech Stack

- React + Vite for the frontend
- Supabase for backend (auth, database, storage)
- React Router for navigation
- Real-time subscriptions for live updates

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Vercel (Recommended)

1. Fork this repository
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your forked repository
4. Add the following environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist` directory to your hosting provider

## Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Run the SQL commands from `schema.sql` in the SQL editor
3. Enable Row Level Security (RLS) policies
4. Create storage bucket named 'hex-files'
5. Update your environment variables with the new project credentials

## License

MIT
