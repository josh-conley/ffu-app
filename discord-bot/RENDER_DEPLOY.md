# Deploy FFU Discord Bot to Render (Free)

This guide will deploy your FFU Discord Bot to Render's free tier.

## 🆓 **Render Free Tier Details:**
- ✅ **750 hours/month free** (enough for moderate usage)
- ⚠️ **Sleeps after 15 minutes** of inactivity (wakes up in ~30 seconds)
- ✅ **Perfect for getting started**

## 🚀 **Step-by-Step Deployment:**

### Step 1: Commit Your Bot Code

```bash
# Make sure you're in the main ffu-app directory
git add discord-bot/
git commit -m "Add FFU Discord Bot for Render deployment"
git push
```

### Step 2: Set Up Render Account

1. Go to [render.com](https://render.com)
2. **Sign up with GitHub** (recommended for easy repo access)
3. Verify your email if prompted

### Step 3: Create Web Service

1. **Click "New +"** in Render dashboard
2. **Select "Web Service"**
3. **Connect your GitHub account** if not already connected
4. **Find your `ffu-app` repository** and click "Connect"

### Step 4: Configure the Service

**Important settings:**
- **Name**: `ffu-discord-bot`
- **Region**: Choose closest to you
- **Root Directory**: `discord-bot` (very important!)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### Step 5: Set Environment Variables

In the Render dashboard, scroll down to **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `DISCORD_TOKEN` | `your_bot_token_here` |
| `DISCORD_CLIENT_ID` | `your_client_id_here` |
| `FFU_DATA_BASE_URL` | `https://josh-conley.github.io/ffu-app/data` |
| `NODE_ENV` | `production` |

### Step 6: Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment** (usually 2-5 minutes)
3. **Check logs** for any errors
4. **Look for**: `🤖 FFU Bot is ready! Logged in as YourBot#1234`

### Step 7: Deploy Discord Commands

**After your bot is deployed**, you need to register the slash commands:

**Option A: Run locally (easier)**
```bash
# In your discord-bot directory
DISCORD_TOKEN=your_token DISCORD_CLIENT_ID=your_client_id node deploy-commands.js
```

**Option B: Temporary environment variable**
1. Add `DEPLOY_COMMANDS=true` to environment variables in Render
2. Redeploy the service
3. Remove the variable after deployment completes

### Step 8: Test Your Bot

1. **Go to Discord**
2. **Try the commands:**
   - `/standings league:Masters year:2024`
   - `/draft league:National year:2025`

You should see proper team names like "The Stallions", "FFUcked Up", etc.!

## 🔧 **Managing Your Bot:**

### Viewing Logs
- **Render Dashboard** → Your service → **Logs tab**
- Real-time logs to debug any issues

### Monitoring Uptime  
- **Render Dashboard** → Your service → **Metrics tab**
- See when bot sleeps/wakes up

### Keeping Bot Awake (Optional)
If your community uses the bot frequently, you can use a service like **UptimeRobot** to ping your bot every 14 minutes to keep it awake:

1. **Sign up for UptimeRobot** (free)
2. **Add monitor** with your Render app URL + `/health`
3. **Set interval** to 5 minutes
4. **Bot stays awake** during active hours

## 🚨 **Troubleshooting:**

### Bot Not Responding
1. **Check Render logs** for errors
2. **Verify environment variables** are correct
3. **Ensure slash commands were deployed**
4. **Check Discord bot permissions**

### "Application did not respond" 
- **Bot is sleeping** - try command again in 30 seconds
- **Or set up UptimeRobot** to keep it awake

### Build Failed
- **Check Root Directory** is set to `discord-bot`
- **Verify package.json** exists in discord-bot folder
- **Check logs** for specific error messages

### Data Not Loading
- **Test FFU data URL** in browser: `https://josh-conley.github.io/ffu-app/data/2024/masters.json`
- **Check environment variable** `FFU_DATA_BASE_URL` is correct

## 💰 **Cost Management:**

### Free Tier Limits
- **750 hours/month** = ~25 hours/day average
- **Perfect for small-medium communities**
- **Bot sleeps when not used** = saves hours

### Usage Monitoring
- **Render dashboard** shows hours used
- **Plan accordingly** for month-end

### When to Upgrade
Consider **$7/month plan** if:
- ✅ Bot is heavily used (>750 hours/month)  
- ✅ You want 24/7 availability
- ✅ Community is active and growing

## 🎉 **Success!**

Your FFU Discord Bot is now live and accessible to your entire community! 

**Share these commands with your league:**
- `/standings league:Masters year:2024` - Current standings
- `/draft league:National year:2025 round:1` - Draft results
- `/draft league:Premier year:2023` - Full draft summary

The bot will show proper team names and beautiful Discord embeds for all your FFU data!