# IBM Cloud Code Engine Setup Guide
## Quick Start for IBMers

## Prerequisites

1. **IBM Cloud Account Access**
   - Log in to https://cloud.ibm.com with your IBM w3id
   - If you don't have access, request it at: https://ibm.biz/cloud-access

2. **Install IBM Cloud CLI**
   ```bash
   # macOS
   curl -fsSL https://clis.cloud.ibm.com/install/osx | sh
   
   # Verify installation
   ibmcloud --version
   ```

3. **Install Code Engine Plugin**
   ```bash
   ibmcloud plugin install code-engine
   ```

## Deployment Options

### Option 1: Automated Deployment (Recommended)

We've created a deployment script that handles everything automatically:

```bash
cd deep-research-nexus-app
./deploy-to-ibm-cloud.sh
```

This script will:
- ✅ Check if you're logged in (prompts SSO login if needed)
- ✅ Create or select the Code Engine project
- ✅ Build your Docker container
- ✅ Deploy the application
- ✅ Provide you with the public URL

**First-time deployment takes 5-10 minutes** (building the container)
**Subsequent updates take 2-3 minutes**

### Option 2: Manual Deployment

If you prefer manual control:

#### Step 1: Login to IBM Cloud
```bash
ibmcloud login --sso
```
Follow the prompts to authenticate with your IBM w3id.

#### Step 2: Select Region
```bash
ibmcloud target -r us-south
```
Available regions: `us-south`, `us-east`, `eu-de`, `eu-gb`, `jp-tok`, `jp-osa`, `au-syd`

#### Step 3: Create Code Engine Project
```bash
ibmcloud ce project create --name deep-research-nexus
ibmcloud ce project select --name deep-research-nexus
```

#### Step 4: Deploy Application
```bash
cd deep-research-nexus-app

ibmcloud ce application create \
  --name deep-research-app \
  --build-source . \
  --strategy dockerfile \
  --port 8080 \
  --min-scale 0 \
  --max-scale 2 \
  --cpu 0.25 \
  --memory 0.5G \
  --env API_URL=https://deep-research-api-mrqq.onrender.com/deep-research \
  --wait \
  --wait-timeout 600
```

#### Step 5: Get Your Application URL
```bash
ibmcloud ce application get --name deep-research-app
```

Look for the URL in the output - it will look like:
`https://deep-research-app.xxxxxxxxx.us-south.codeengine.appdomain.cloud`

## Understanding the Configuration

### Dockerfile
- Uses Python 3.11 slim image
- Installs dependencies from requirements.txt
- Exposes port 8080 (Code Engine standard)
- Runs uvicorn server

### Resource Allocation
- **CPU**: 0.25 vCPU (sufficient for light-medium traffic)
- **Memory**: 0.5 GB (adequate for FastAPI app)
- **Min Scale**: 0 (scales to zero when idle - saves costs!)
- **Max Scale**: 2 (can handle moderate traffic)

### Cost Implications (Free Tier)
With these settings, your app will:
- **Scale to zero** when not in use (no cost)
- Use minimal resources when active
- Stay within free tier limits for development/testing

**Free Tier Includes:**
- 100,000 vCPU-seconds per month
- 200,000 GB-seconds of memory per month

## Managing Your Application

### View Application Status
```bash
ibmcloud ce application get --name deep-research-app
```

### View Real-time Logs
```bash
ibmcloud ce application logs --name deep-research-app --follow
```

### Update Application (After Code Changes)
```bash
# Option 1: Use the script
./deploy-to-ibm-cloud.sh

# Option 2: Manual update
ibmcloud ce application update --name deep-research-app --build-source .
```

### Scale Your Application
```bash
# Increase capacity
ibmcloud ce application update --name deep-research-app \
  --min-scale 1 \
  --max-scale 5 \
  --cpu 0.5 \
  --memory 1G

# Return to minimal (cost-effective)
ibmcloud ce application update --name deep-research-app \
  --min-scale 0 \
  --max-scale 2 \
  --cpu 0.25 \
  --memory 0.5G
```

### Add Environment Variables
```bash
# Add a new environment variable
ibmcloud ce application update --name deep-research-app \
  --env NEW_VAR=value

# Add sensitive data as secrets
ibmcloud ce secret create --name api-secrets \
  --from-literal AGENTS_API_KEY=your_key_here

ibmcloud ce application update --name deep-research-app \
  --env-from-secret api-secrets
```

### Delete Application
```bash
ibmcloud ce application delete --name deep-research-app
```

### Delete Project
```bash
ibmcloud ce project delete --name deep-research-nexus
```

## Sharing Your Application

Once deployed, you can share the URL with anyone:
- ✅ No authentication required for public access
- ✅ HTTPS enabled by default
- ✅ Works exactly like your Render deployment
- ✅ Accessible from anywhere

Example URL format:
```
https://deep-research-app.xxxxxxxxx.us-south.codeengine.appdomain.cloud
```

## Troubleshooting

### Build Fails
```bash
# View build logs
ibmcloud ce buildrun list
ibmcloud ce buildrun logs --name <buildrun-name>
```

Common issues:
- Missing dependencies in requirements.txt
- Dockerfile syntax errors
- Port configuration issues

### Application Won't Start
```bash
# Check application events
ibmcloud ce application events --name deep-research-app

# Check logs
ibmcloud ce application logs --name deep-research-app --tail 100
```

Common issues:
- App not listening on port 8080
- Missing environment variables
- Import errors

### Timeout During Deployment
The first deployment can take 10+ minutes. If it times out:
```bash
# Check build status
ibmcloud ce buildrun list

# Wait for build to complete, then check app status
ibmcloud ce application get --name deep-research-app
```

### Can't Access Application
1. Check if app is running:
   ```bash
   ibmcloud ce application get --name deep-research-app
   ```
2. Look for "Ready" status
3. Verify the URL is correct
4. Check logs for errors

## Monitoring and Maintenance

### Set Up Monitoring
```bash
# View application metrics
ibmcloud ce application get --name deep-research-app --output json
```

### Regular Maintenance
1. **Update dependencies** regularly in requirements.txt
2. **Monitor logs** for errors
3. **Check resource usage** to optimize costs
4. **Update application** after code changes

## IBM Enterprise GitHub Integration

### Option 1: Deploy from Enterprise GitHub
If your code is in IBM's enterprise GitHub:

```bash
# Create GitHub access token first
ibmcloud ce registry create --name github-registry \
  --server ghcr.io \
  --username your-github-username \
  --password your-github-token

# Deploy from GitHub
ibmcloud ce application create \
  --name deep-research-app \
  --build-source https://github.ibm.com/your-org/deep-research-nexus-app \
  --build-context-dir . \
  --strategy dockerfile \
  --port 8080 \
  --min-scale 0 \
  --max-scale 2 \
  --cpu 0.25 \
  --memory 0.5G
```

### Option 2: Set Up CI/CD with GitHub Actions
Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to IBM Cloud

on:
  push:
    branches: [ main, master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Install IBM Cloud CLI
      run: |
        curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
        ibmcloud plugin install code-engine
    
    - name: Deploy to Code Engine
      env:
        IBM_CLOUD_API_KEY: ${{ secrets.IBM_CLOUD_API_KEY }}
      run: |
        ibmcloud login --apikey $IBM_CLOUD_API_KEY -r us-south
        ibmcloud ce project select --name deep-research-nexus
        ibmcloud ce application update --name deep-research-app \
          --build-source . \
          --wait
```

## Getting Help

- **IBM Cloud Docs**: https://cloud.ibm.com/docs/codeengine
- **IBM Internal Slack**: #ibmcloud-code-engine
- **IBM Cloud Support**: Open ticket at cloud.ibm.com
- **W3 Community**: Search "Code Engine" on w3

## Quick Reference

```bash
# Login
ibmcloud login --sso

# List projects
ibmcloud ce project list

# Select project
ibmcloud ce project select --name deep-research-nexus

# List apps
ibmcloud ce application list

# Get app details
ibmcloud ce application get --name deep-research-app

# View logs
ibmcloud ce application logs --name deep-research-app --follow

# Update app
ibmcloud ce application update --name deep-research-app --build-source .

# Delete app
ibmcloud ce application delete --name deep-research-app
```

## Next Steps

1. ✅ Run the deployment script: `./deploy-to-ibm-cloud.sh`
2. ✅ Wait for deployment to complete (5-10 minutes)
3. ✅ Get your application URL
4. ✅ Test the application
5. ✅ Share the URL with your team!

Your deep research agent will work exactly the same as on Render, but hosted on IBM Cloud infrastructure!