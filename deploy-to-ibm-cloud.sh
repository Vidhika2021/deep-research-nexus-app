#!/bin/bash

# IBM Cloud Code Engine Deployment Script
# Deep Research Nexus App

set -e

echo "🚀 IBM Cloud Code Engine Deployment Script"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="deep-research-nexus"
APP_NAME="deep-research-app"
REGION="us-south"  # Change if needed: us-south, eu-de, jp-tok, etc.

# Check if IBM Cloud CLI is installed
if ! command -v ibmcloud &> /dev/null; then
    echo -e "${RED}❌ IBM Cloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.ibm.com/docs/cli"
    exit 1
fi

echo -e "${GREEN}✅ IBM Cloud CLI found${NC}"

# Check if Code Engine plugin is installed
if ! ibmcloud plugin list | grep -q "code-engine"; then
    echo -e "${YELLOW}⚠️  Code Engine plugin not found. Installing...${NC}"
    ibmcloud plugin install code-engine -f
fi

echo -e "${GREEN}✅ Code Engine plugin found${NC}"
echo ""

# Login check
echo "Checking IBM Cloud login status..."
if ! ibmcloud target &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to IBM Cloud${NC}"
    echo "Logging in with SSO..."
    ibmcloud login --sso
else
    echo -e "${GREEN}✅ Already logged in to IBM Cloud${NC}"
fi

# Set region
echo ""
echo "Setting region to ${REGION}..."
ibmcloud target -r ${REGION}

# Check if project exists
echo ""
echo "Checking for existing project..."
if ibmcloud ce project get --name ${PROJECT_NAME} &> /dev/null; then
    echo -e "${GREEN}✅ Project '${PROJECT_NAME}' found${NC}"
    ibmcloud ce project select --name ${PROJECT_NAME}
else
    echo -e "${YELLOW}⚠️  Project '${PROJECT_NAME}' not found. Creating...${NC}"
    ibmcloud ce project create --name ${PROJECT_NAME}
    ibmcloud ce project select --name ${PROJECT_NAME}
    echo -e "${GREEN}✅ Project created and selected${NC}"
fi

# Check if application exists
echo ""
echo "Checking for existing application..."
if ibmcloud ce application get --name ${APP_NAME} &> /dev/null; then
    echo -e "${YELLOW}⚠️  Application '${APP_NAME}' exists. Updating...${NC}"
    
    ibmcloud ce application update \
        --name ${APP_NAME} \
        --build-source . \
        --wait \
        --wait-timeout 600
    
    echo -e "${GREEN}✅ Application updated successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Application '${APP_NAME}' not found. Creating...${NC}"
    
    ibmcloud ce application create \
        --name ${APP_NAME} \
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
    
    echo -e "${GREEN}✅ Application created successfully${NC}"
fi

# Get application URL
echo ""
echo "Getting application URL..."
APP_URL=$(ibmcloud ce application get --name ${APP_NAME} --output json | grep -o '"url":"[^"]*' | cut -d'"' -f4)

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo -e "Your application is available at:"
echo -e "${GREEN}${APP_URL}${NC}"
echo ""
echo "To view logs:"
echo "  ibmcloud ce application logs --name ${APP_NAME} --follow"
echo ""
echo "To view application details:"
echo "  ibmcloud ce application get --name ${APP_NAME}"
echo ""
echo "To update the application:"
echo "  ./deploy-to-ibm-cloud.sh"
echo ""

# Made with Bob
