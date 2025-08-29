# FFU Discord Bot - Deployment Guide

This guide shows you how to deploy your FFU Discord Bot to the cloud so others can use it.

## 🚀 Railway Deployment (Recommended - Free)

### Step 1: Prepare Your Repository

1. **Commit your bot code:**
   ```bash
   git add discord-bot/
   git commit -m "Add FFU Discord Bot"
   git push
   ```

### Step 2: Set Up Railway

1. **Sign up for Railway:** Go to [railway.app](https://railway.app)
2. **Sign in with GitHub** (recommended)
3. **Create a new project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo" 
   - Choose your `ffu-app` repository
   - Set the **Root Directory** to `discord-bot`

### Step 3: Configure Environment Variables

In Railway dashboard, go to your project settings and add these variables:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here  
FFU_DATA_BASE_URL=https://josh-conley.github.io/ffu-app/data
NODE_ENV=production
```

### Step 4: Deploy Commands

**Important:** You need to deploy commands to Discord after the first deployment.

1. **Wait for Railway deployment to complete**
2. **Go to Railway dashboard → your project → Settings → Environment**
3. **Add a temporary variable:** `DEPLOY_COMMANDS=true`
4. **Trigger a redeploy** (Railway will restart with this flag)
5. **Remove the variable** after deployment completes

Or run locally once:
```bash
# In your discord-bot directory
DISCORD_TOKEN=your_token DISCORD_CLIENT_ID=your_client_id node deploy-commands.js
```

### Step 5: Test Your Bot

- Go to Discord and try: `/standings league:Masters year:2024`
- The bot should respond with actual team names!

## 🔧 Alternative: Render Deployment

### Step 1: Set Up Render

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory:** `discord-bot`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### Step 2: Environment Variables

Add the same environment variables as Railway.

## 💰 Hosting Costs

### Railway (Free Tier)
- ✅ **500 hours/month free** (bot runs 24/7 = ~720 hours)
- ✅ Good for development and small communities
- ⚠️ May sleep after 500 hours, need paid plan for 24/7

### Render (Free Tier)  
- ✅ **750 hours/month free**
- ✅ Better free tier than Railway
- ⚠️ Sleeps after 15 minutes of inactivity (spins up when used)

### Paid Options
- **Railway Pro:** $5/month for unlimited usage
- **Render Starter:** $7/month for always-on service
- **Fly.io:** ~$5-10/month depending on usage

## 🛠️ Advanced: Custom VPS

If you want full control and potentially lower costs:

### DigitalOcean Droplet ($6/month)
1. Create a $6/month droplet
2. Install Node.js and Git
3. Clone your repo and run the bot with PM2
4. Set up automatic restarts

### Example PM2 setup:
```bash
# On your server
git clone https://github.com/your-username/ffu-app.git
cd ffu-app/discord-bot
npm install
npm install -g pm2

# Create .env with your tokens
echo "DISCORD_TOKEN=your_token" > .env
echo "DISCORD_CLIENT_ID=your_client_id" >> .env
echo "FFU_DATA_BASE_URL=https://josh-conley.github.io/ffu-app/data" >> .env

# Start with PM2
pm2 start index.js --name "ffu-bot"
pm2 startup
pm2 save
```

## 📊 Monitoring Your Bot

### Railway Dashboard
- View logs in real-time
- Monitor resource usage  
- Set up alerts

### Bot Status Commands
Add to your bot:
```javascript
// Add this command to check bot health
client.on('ready', () => {
  console.log(`Bot is running on ${process.env.RAILWAY_ENVIRONMENT || 'local'}`);
});
```

## 🔍 Troubleshooting

### Bot Not Responding
1. **Check Railway logs** for errors
2. **Verify environment variables** are set correctly
3. **Ensure commands were deployed** to Discord
4. **Check bot permissions** in your Discord server

### Data Not Loading
1. **Verify FFU_DATA_BASE_URL** is correct
2. **Test the URL** in browser: `https://josh-conley.github.io/ffu-app/data/2024/masters.json`
3. **Check bot logs** for fetch errors

### Out of Free Hours
1. **Upgrade to paid plan** ($5-7/month)
2. **Switch to different provider** 
3. **Optimize bot** to use fewer resources

## 🎯 Recommended Setup

For a small-medium FFU community:
1. **Start with Railway free tier**
2. **Monitor usage** in dashboard
3. **Upgrade to $5/month** when you hit limits
4. **Consider VPS** if you grow larger

The bot should cost **$0-10/month** depending on usage and hosting choice!