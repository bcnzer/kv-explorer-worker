# kv-explorer-worker
The worker which powers kv-explorer-ui. Can't access the Cloudflare API directly from the SPA (CORS limitations) so I've created some endpoints in Workers

In Cloudflare I setup a `kvexplorerapi.<mydomain>.com`. Pointed it anything, enabled proxying.

I then setup a Worker with a route `kvexplorerapi.<mydomain>.com/*` and pasted in this code into the worker. End result is I have an API on the edge... which just wraps the generic Cloudflare API.

Overall, it's hacky but it was developed for my personal use. 

There's still a bit of work left to do so checkout Issues.
