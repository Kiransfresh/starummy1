# Star Rummy 101 Railway Backend – 6 Player / 30s Score / Split

Deploy these files at the root of the GitHub repository connected to Railway.

Included server behavior:
- fixed six-seat 101 Pool rooms,
- clockwise/right-side turn order,
- exactly 30-second post-declaration score window,
- authoritative score submission and auto-finalization,
- complete round history synchronization,
- automatic 3-player / 2-player split eligibility,
- unanimous split confirmation with exact pool arithmetic,
- existing Joker / drop / reconnect / finish rules.

Railway uses `Dockerfile` and `railway-package.json`; no frontend `src/` directory is required by the backend container.
