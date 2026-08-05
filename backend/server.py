"""
ASGI proxy shim for supervisor.

Supervisor runs `uvicorn server:app` on port 8001, but this app is a MERN stack —
the real business logic lives in the Node.js Express server (index.js).

On startup, this proxy:
  1. Spawns the Node.js Express server on 127.0.0.1:8002
  2. Reverse-proxies ALL incoming requests to it

This gives a genuine Node/Express/Mongo backend under supervisor's uvicorn requirement.
"""
import os
import asyncio
import subprocess
import signal
from pathlib import Path
import httpx
from starlette.applications import Starlette
from starlette.responses import Response, StreamingResponse
from starlette.requests import Request
from starlette.routing import Route

ROOT = Path(__file__).parent
NODE_PORT = 8002
NODE_HOST = "127.0.0.1"
NODE_URL = f"http://{NODE_HOST}:{NODE_PORT}"

_node_process: subprocess.Popen | None = None
_client: httpx.AsyncClient | None = None


async def _wait_ready(timeout: float = 20.0):
    deadline = asyncio.get_event_loop().time() + timeout
    async with httpx.AsyncClient(timeout=1.0) as c:
        while asyncio.get_event_loop().time() < deadline:
            try:
                r = await c.get(f"{NODE_URL}/api/health")
                if r.status_code < 500:
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.3)
    return False


async def startup():
    global _node_process, _client
    env = os.environ.copy()
    env["PORT"] = str(NODE_PORT)
    _node_process = subprocess.Popen(
        ["node", "index.js"],
        cwd=str(ROOT),
        env=env,
        stdout=None,
        stderr=None,
    )
    await _wait_ready()
    _client = httpx.AsyncClient(base_url=NODE_URL, timeout=30.0)


async def shutdown():
    global _node_process, _client
    if _client:
        await _client.aclose()
    if _node_process and _node_process.poll() is None:
        _node_process.send_signal(signal.SIGTERM)
        try:
            _node_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _node_process.kill()


HOP_BY_HOP = {"connection", "keep-alive", "transfer-encoding", "upgrade",
              "proxy-authorization", "proxy-authenticate", "te", "trailers",
              "content-encoding", "content-length"}


async def proxy(request: Request):
    global _client
    if _client is None:
        return Response("Backend not ready", status_code=503)
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host",)}
    try:
        upstream = await _client.request(
            method=request.method,
            url=request.url.path + ("?" + request.url.query if request.url.query else ""),
            content=body,
            headers=headers,
            follow_redirects=False,
        )
    except httpx.ConnectError:
        return Response("Upstream unavailable", status_code=502)
    resp_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP}
    return Response(content=upstream.content, status_code=upstream.status_code, headers=resp_headers)


app = Starlette(
    debug=False,
    routes=[Route("/{path:path}", proxy, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])],
    on_startup=[startup],
    on_shutdown=[shutdown],
)
