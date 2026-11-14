#!/usr/bin/env bash
# output counts and sizes after the build (for the report)
cd dist && echo "files: $(find . -type f | wc -l)"; echo "pages (index.html): $(find . -name index.html | wc -l)"; echo "dist size: $(du -sh . | cut -f1)"; echo "site.tar: $(ls -la ../site.tar 2>/dev/null | awk '{print $5}') bytes" 
