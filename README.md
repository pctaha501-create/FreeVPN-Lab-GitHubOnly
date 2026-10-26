# FreeVPN Lab

A public, BPB-inspired configuration panel and an experimental Cloudflare Workers VLESS-over-WebSocket tunnel prototype. The repository is MIT-licensed.

## Current features

- Static setup panel hosted by GitHub Pages.
- Generates a VLESS-over-WebSocket URI and a basic Clash-compatible YAML profile locally in the browser.
- Checks the Worker `/health` endpoint.
- Checks the public IP visible to the browser (this is not a “clean IP” reputation test).
- Worker prototype uses a UUID stored as a Cloudflare Worker secret, not in source control.
- GitHub Actions workflow for deploying the Worker through Wrangler.

## Important limitations

This is an **experimental prototype, not a guaranteed production VPN**. Cloudflare Workers are not a general-purpose VPN hosting platform. Outbound TCP sockets are subject to Cloudflare runtime restrictions, and a free Workers account currently has a 100,000 requests/day limit and 10 ms CPU time per request. There is no promise of unlimited bandwidth, a clean IP, stable connections, or access to every destination. See the [official Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [TCP sockets documentation](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

The prototype supports VLESS TCP destinations over a WebSocket transport at `/ws`. It does not implement UDP, DNS tunneling, fallback, load balancing, user quotas, subscription revocation, or a full BPB management backend. Client compatibility can vary by client version and network.

## Deploy the static panel

In GitHub, open **Settings → Pages** and choose deployment from branch `main`, folder `/` (root). The expected site URL is:

`https://pctaha501-create.github.io/FreeVPN-Lab-GitHubOnly/`

## Deploy the Worker via GitHub Actions

1. In Cloudflare, create a scoped API token with permission to edit Workers for the correct account.
2. In GitHub, open **Settings → Secrets and variables → Actions**.
3. Add repository secret `CLOUDFLARE_API_TOKEN` and repository variable `CLOUDFLARE_ACCOUNT_ID`.
4. Run the **Deploy Cloudflare Worker** workflow from the Actions tab (or push a change to Worker files).
5. In Cloudflare Workers & Pages, open `freevpn-lab-githubonly` and add a secret named `UUID`. Generate a fresh UUID locally and do not commit it.
6. Check `https://freevpn-lab-githubonly.<your-workers-subdomain>.workers.dev/health`. The expected status is `configured`.
7. In the GitHub Pages panel, enter the Worker hostname and the same UUID, then generate a profile.

### UUID secret setup

Generate a UUID with a local tool (for example, `uuidgen` or PowerShell `[guid]::NewGuid()`). Set it as a Worker secret named exactly `UUID` in the Cloudflare dashboard. Never place the UUID in this repository or in public issue comments.

## Client import

- **V2RayNG / v2rayN / Hiddify:** import the generated VLESS URI where supported.
- **FlClash:** use the generated Clash YAML profile.

The generated configuration is a starting point only. It does not confirm that Cloudflare allows the chosen destination socket or that the connection works on your network.

## Security notes

- Do not expose the UUID publicly; anyone who obtains it may use the tunnel.
- This prototype has no per-user account system, per-user quotas, abuse prevention, or subscription revocation.
- Do not advertise this as a secure, anonymous, unlimited, or production-grade VPN until those controls and real-world tests are complete.
- Avoid logging UUIDs or full profile URLs. Rotate the UUID immediately if it leaks.

## Development

```sh
npm install
npm run check
```
