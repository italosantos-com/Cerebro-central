# GitHub Copilot Coding Agent Configuration

This directory contains configuration and setup scripts for GitHub Copilot coding agent.

## Setup Steps

The `setup.sh` script is executed before the firewall is enabled to pre-fetch resources that would otherwise be blocked.

### What it does:
- Pre-downloads Google Fonts CSS files to avoid runtime firewall restrictions
- Caches fonts locally in `/tmp/google-fonts-cache`

## Firewall Allowlist

If you encounter firewall issues, you can add the following domains to the allowlist in the repository's [Copilot coding agent settings](https://github.com/studiofirebase/studiofirebase/settings/copilot/coding_agent):

- `fonts.googleapis.com` - Required for Google Fonts API
- `fonts.gstatic.com` - Required for Google Fonts font files (if needed)

## Usage

To use the setup script in your Copilot coding agent workflow:

1. The setup script is automatically detected and run before the firewall is enabled
2. Alternatively, configure it explicitly in your repository's Copilot coding agent settings

## More Information

For more details on configuring Copilot coding agent setup steps, see the GitHub documentation for Copilot configuration and best practices.
