#!/bin/bash

# Firebase Deployment Script for Italo Santos Studio
# This script builds and deploys the application to Firebase

set -e

echo "🚀 Starting Firebase deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building the application..."
npm run build

echo "📤 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be available at: https://YOUR_FIREBASE_PROJECT_ID.web.app"
