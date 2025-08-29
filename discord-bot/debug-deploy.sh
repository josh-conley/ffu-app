#!/bin/bash

echo "🔧 Deploying debug fixes to Render..."

# Commit changes
git add .
git commit -m "Add debugging improvements and test command"

# Push to trigger Render deployment
git push

echo "✅ Changes pushed! Render will redeploy automatically."
echo ""
echo "🧪 After deployment, try these commands in Discord:"
echo "1. /test - Check if everything is working"
echo "2. /standings league:National year:2024 - Try original command"
echo ""
echo "📋 Check Render logs for detailed error information."