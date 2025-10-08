# Newsletter Management with Decap CMS

This guide explains how the Commissioner can upload and manage weekly newsletter PDFs through a simple admin interface.

## For the Commissioner

### Accessing the Admin Panel

1. Navigate to your site's admin page: `https://josh-conley.github.io/ffu-app/admin/`
2. Click "Login with GitHub"
3. Authorize the application (one-time setup)

### Uploading a Newsletter

1. In the admin panel, click **"Newsletters"** in the sidebar
2. Click **"New Newsletters"**
3. Fill in the form:
   - **Season**: Year (e.g., 2025)
   - **Week**: Week number (1-17)
   - **Title**: Newsletter title (e.g., "Week 1: Season Kickoff")
   - **Publish Date**: Select date and time
   - **Newsletter PDF**: Click to upload your PDF file
   - **Featured** (optional): Check to highlight on home page
   - **Summary** (optional): Brief description
4. Click **"Publish"**
5. The newsletter will automatically appear on the site at `/newsletters`

### Editing Existing Newsletters

1. In the admin panel, click **"Newsletters"**
2. Click on the newsletter you want to edit
3. Make changes
4. Click **"Publish"** to save

### Deleting Newsletters

1. In the admin panel, click **"Newsletters"**
2. Click on the newsletter you want to delete
3. Click the **"Delete"** button in the toolbar
4. Confirm deletion

## For Developers

### Initial Netlify Setup

To enable the admin panel authentication:

1. **Import to Netlify**:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select `josh-conley/ffu-app`
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy"

2. **Enable GitHub OAuth** (automatic with Netlify):
   - Netlify automatically handles GitHub authentication
   - No manual OAuth app creation needed!

3. **Update GitHub Pages (Optional)**:
   - You can keep GitHub Pages for the main site
   - And use Netlify ONLY for the admin panel
   - Or switch entirely to Netlify (both work the same)

### How It Works

1. **Decap CMS** provides the admin UI at `/admin`
2. When Commissioner uploads a PDF:
   - Decap commits the PDF to `public/newsletters/` in your GitHub repo
   - Decap creates/updates a markdown file with metadata
   - GitHub Actions rebuilds and deploys the site
3. **Newsletters page** reads from `public/newsletters/index.json`
4. Users can view/download PDFs

### File Structure

```
public/
├── admin/
│   ├── index.html          # Decap CMS admin interface
│   └── config.yml          # CMS configuration
└── newsletters/
    ├── index.json          # Newsletter metadata (auto-generated)
    └── *.pdf               # Uploaded newsletter PDFs
```

### Configuration

The newsletter collection is configured in `public/admin/config.yml`:

```yaml
collections:
  - name: "newsletters"
    label: "Newsletters"
    folder: "public/newsletters"
    fields:
      - season (number)
      - week (number)
      - title (string)
      - date (datetime)
      - pdf (file)
      - featured (boolean, optional)
      - summary (text, optional)
```

### Updating the Configuration

To modify newsletter fields or add new collections:

1. Edit `public/admin/config.yml`
2. Commit and push changes
3. Changes take effect immediately

### Migrating Existing Newsletters

If you have existing PDFs to add:

1. Place PDF files in `public/newsletters/`
2. Use the admin panel to create entries for each
3. Or manually create an `index.json` with this structure:

```json
[
  {
    "season": 2024,
    "week": 1,
    "title": "Week 1: Opening Day",
    "date": "2024-09-10T12:00:00Z",
    "pdf": "/newsletters/2024-week-1.pdf",
    "featured": false,
    "summary": "Season opener recap"
  }
]
```

### Troubleshooting

**Admin panel won't load:**
- Check that files exist at `/public/admin/index.html` and `/public/admin/config.yml`
- Clear browser cache and try again

**Can't login:**
- Ensure site is deployed to Netlify (GitHub OAuth requires a live URL)
- Check Netlify site settings → Identity & Git Gateway

**Newsletters don't appear:**
- Check `public/newsletters/index.json` exists and is valid JSON
- Verify PDF paths are correct in the JSON file

**PDFs won't upload:**
- Check file size (keep under 10MB for best performance)
- Ensure GitHub repo has enough storage

### Netlify vs GitHub Pages

**Current Setup**: GitHub Pages

**Recommended**: Switch to Netlify

**Why?**
- ✅ Built-in GitHub OAuth (no manual setup)
- ✅ Automatic HTTPS
- ✅ Faster builds
- ✅ Better build logs
- ✅ Same free tier
- ✅ Same custom domain support

**Migration**: Simply import your GitHub repo to Netlify (5 minutes)

## Support

For issues or questions:
- Technical issues: Check this guide first
- Feature requests: Contact the developer
- CMS documentation: [Decap CMS Docs](https://decapcms.org/docs/)
