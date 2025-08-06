#!/usr/bin/env python3
"""
Development server with hot reloading for the MCP Client backend.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[".", "../../../vibe-worldbuilding-mcp"],
        log_level="info"
    )
