# CB Lemons Menu Manager

A collaborative menu management system for CB Lemons restaurants. Develop, test, and launch menus across locations with strict allergen disclosure and multi-environment support.

## Features

- **Multiple Locations** — Manage CB Lemons Seaside, Standalone, and other concepts separately
- **Environment Pipeline** — Dev → Test → Preprod → Production workflow
- **Rich Dish Management** — Descriptions, ingredients, allergens, photos, videos, internal notes
- **Strict Allergen Disclosure** — Master allergen list with auto-tagging and warnings
- **Public Preview** — Clean customer-facing menu view (internal notes hidden)
- **Real-time Sync** — Powered by Supabase PostgreSQL

## Tech Stack

- **Frontend:** React 18
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel
- **Domain:** cblemons.com

## Setup

### Prerequisites

- Node.js 16+ installed
- GitHub account (`cblemons`)
- Supabase project created

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/cblemons/cblemons-menu.git
   cd cblemons-menu
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
     - `REACT_APP_SUPABASE_URL` — Found in Supabase project settings
     - `REACT_APP_SUPABASE_ANON_KEY` — Found in Supabase project settings

4. **Run the development server**
   ```bash
   npm start
   ```
   
   App will open at `http://localhost:3000`

### Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Click "Settings" (bottom left)
3. Click "API"
4. Copy the **Project URL** and **Anon Key**
5. Paste into `.env.local`

## Deploying to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to vercel.com
   - Click "Import Project"
   - Select your GitHub repo
   - Add environment variables (same as `.env.local`)
   - Deploy

3. **Point cblemons.com to Vercel**
   - In Namecheap DNS settings, add Vercel's nameservers or CNAME
   - (Vercel will provide exact instructions)

## Database Schema

The Supabase database includes:
- `locations` — Restaurant concepts
- `menu_sections` — Sections like "Ineffable Salads"
- `dishes` — Individual menu items
- `allergens` — Master allergen list
- `dish_allergens` — Links dishes to allergens
- `dish_images` — Hero, process, and plating photos
- `dish_media` — Video links and external media

## Usage

### Dashboard
Quick stats on locations, sections, dishes, and production status.

### Locations
Create and manage restaurant locations (Seaside, Standalone, etc.).

### Menus
Create sections and organize the menu structure.

### Dishes
Add dishes with public descriptions, internal prep notes, ingredients, and allergens.

### Allergens
Manage the master allergen list and tag dishes.

### Preview
See the clean public-facing menu (no internal notes).

## Development Notes

- **Internal vs. Public:** Dev/test environments show all notes. Production hides prep and creation notes.
- **Environments:** Dishes flow dev → test → preprod → production.
- **Allergen Warnings:** Production menu shows red allergen badges for customer safety.
- **Photos:** Upload hero image, process step photos, and plating shots.

## Next Steps

- [ ] Image upload to Supabase Storage
- [ ] Video link integration
- [ ] User authentication (optional)
- [ ] Dish status workflow (draft → ready → published)
- [ ] Multi-language support
- [ ] API for third-party integrations

## Support

For issues or questions, contact the development team.

---

**Created for CB Lemons by Anthropic Claude**
