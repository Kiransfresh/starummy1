# Server 1.7.41

Declaration-only windows finish as soon as all eligible players submit, or at the existing 30-second deadline. Submitted players remain locked; no normal draw/discard/drop turn resumes during the window. Late expiry callbacks cannot score a finalized round twice.

The first valid declarer stays the round winner. Existing 101 scoring, wrong-show penalties and history are unchanged. Split vote default is 60 seconds (the live global setting is already 60); explicit table settings remain supported.

Covered by actual socket-handler regressions for two and six players across three rounds, early completion, timeout completion and duplicate callbacks in the full app test suite.
