# Apollo 2.3.94 / Build 307 candidate

Scan-plan saving now rechecks the connected receiver instead of retaining a failed startup decision. Settings shows the current blocker and includes **Check Receiver Again**, which keeps unsaved edits. Same-device recovery preserves the existing hardware identity and calibration safeguards. Credential-free setup status is included in the existing authenticated check-in to reduce requests for customer diagnostics.

This is one universal ARM64 application package on the published Build 306 lineage. Required source and exact-package ARM64 qualification passed, with two byte-identical builds. The signed updater remains 1.0.85. Native receiver binaries and the KA9Q pin are unchanged.

The application asset is published first for canonical complete-installer qualification. The complete installer requires signed exact-artifact owned RTL bench installation, retry, preserved state, real check-ins and reports, sustained configured-window progress, and actual reboot continuity before download-card activation. This application record alone makes no physical receiver, reporting or reboot claim. Other receiver and known-transmission accuracy qualification remain separate.
