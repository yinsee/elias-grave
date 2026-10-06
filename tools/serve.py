#!/usr/bin/env python3
"""Static dev server that tells the browser not to cache, so a plain reload always loads the new modules.

usage: tools/serve.py [port]   (default 8765; serves the repo root)
"""
import functools, http.server, os, sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=root)).serve_forever()
