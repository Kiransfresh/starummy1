# Star Rummy 101 Railway Backend

This backend matches the Left Deal + Round Scoreboard client build.

Changes:
- room dealing uses one-card-per-seat round-robin distribution;
- round results are emitted to every connected player;
- reconnecting players can receive the active round result;
- existing 101 Pool Joker and room-stop logic remains included.

Deploy the files in this folder to the GitHub repository connected to Railway, then redeploy the Railway service.
