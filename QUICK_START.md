# Quick Start - Deploy to IBM Cloud Code Engine

## Step 1: Install IBM Cloud CLI

Run this command in your terminal:

```bash
curl -fsSL https://clis.cloud.ibm.com/install/osx | sh
```

This will install the IBM Cloud CLI on your Mac.

## Step 2: Install Code Engine Plugin

After the CLI is installed, run:

```bash
ibmcloud plugin install code-engine
```

## Step 3: Deploy Your Application

Simply run the deployment script:

```bash
cd ~/Desktop/deep-research-nexus-app
./deploy-to-ibm-cloud.sh
```

The script will:
1. Prompt you to login with your IBM w3id (SSO)
2. Create a Code Engine project
3. Build and deploy your application
4. Give you a public URL to share

**First deployment takes 5-10 minutes**

## Step 4: Get Your URL

After deployment completes, you'll see output like:

```
🎉 Deployment Complete!
Your application is available at:
https://deep-research-app.xxxxxxxxx.us-south.codeengine.appdomain.cloud
```

Share this URL with anyone - it works just like your Render deployment!

## Troubleshooting

If you encounter any issues, check the detailed guide:
- `IBM_CLOUD_SETUP.md` - Complete setup instructions
- `IBM_CLOUD_DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide

## Need Help?

Run these commands to check status:

```bash
# Check if CLI is installed
ibmcloud --version

# Check if you're logged in
ibmcloud target

# View your application
ibmcloud ce application get --name deep-research-app

# View logs
ibmcloud ce application logs --name deep-research-app --follow
```

## What's Different from Render?

**Nothing!** Your application will work exactly the same:
- ✅ Same HTML frontend
- ✅ Same backend processing
- ✅ Same API endpoints
- ✅ Just hosted on IBM Cloud instead of Render

The only difference is the URL domain will be `*.codeengine.appdomain.cloud` instead of `*.onrender.com`.