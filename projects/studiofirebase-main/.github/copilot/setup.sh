#!/bin/bash
# GitHub Copilot Coding Agent Setup Script
# This script runs before the firewall is enabled, allowing access to required resources

set -e

echo "Setting up environment for Copilot coding agent..."

# Pre-download Google Fonts to avoid firewall blocks during runtime
# This downloads the fonts CSS files while the firewall is not yet active
if command -v curl &> /dev/null; then
    echo "Pre-fetching Google Fonts to avoid firewall restrictions..."
    mkdir -p /tmp/google-fonts-cache
    
    # Download common Google Fonts CSS (this will be cached)
    curl -sL "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" \
         -o /tmp/google-fonts-cache/roboto.css || echo "Warning: Could not pre-fetch Roboto font"
    
    curl -sL "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" \
         -o /tmp/google-fonts-cache/inter.css || echo "Warning: Could not pre-fetch Inter font"
    
    echo "Google Fonts pre-fetching completed"
else
    echo "curl not found, skipping font pre-fetching"
fi

echo "Setup completed successfully"
