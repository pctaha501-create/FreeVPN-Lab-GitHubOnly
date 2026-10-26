# FreeVPN Lab — GitHub Only

A small, transparent learning project for exploring what GitHub can and cannot do for VPN-related tooling.

## Important limitation

**This repository does not provide a working VPN tunnel or VPN exit server.** GitHub Pages hosts static files, and GitHub Actions jobs are temporary CI runners. Neither is a supported always-on VPN server. Do not use Actions as a persistent proxy/tunnel or to evade platform limits.

## What this project can do

- Host documentation and a simple static information page with GitHub Pages.
- Run short automated checks with GitHub Actions.
- Later, add a local configuration guide or a client-side configuration validator that does not store private keys.

## What it cannot do on GitHub alone

- Route all Windows/Android internet traffic through a VPN.
- Provide a stable VPN endpoint or a persistent WireGuard server.
- Create a VPN server without some machine or service that actually forwards network traffic.

## Publish the static page

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then save.
4. Wait for GitHub Pages to publish the page.

The site is informational only; publishing it does not turn it into a VPN.

## Security

Never commit VPN private keys, passwords, access tokens, or real user configuration files. Public repositories are visible to everyone.

## License

MIT