# Apollo Build 305 qualification candidate

Apollo 2.3.92 / Build 305 fixes credential-agent request timeouts and includes agent build 52. This application candidate is needed to exercise the canonical signed updater on the owned bench. Source and isolated ARM64 package checks have passed; physical bench RF/reporting/reboot qualification and the customer upgrade are still pending. The complete installer, public download card and automatic-update target remain unchanged.

Application: `ApolloPassiveReceive-2.3.92-build.305-linux-arm64.zip`, 19875979 bytes, SHA256 `70d17f9fdd07c181078b9d7079abf700877eb1eda773809c1e377b5869ec79f6`, source `3adfa18661abc10a8765eb4580d37638974d63b2`.

The proposed public updater mirror is the exact existing production-signed 1.0.85 release from [the canonical source release](https://github.com/gdowkpc/apollo/releases/tag/apollo-universal-pi-updater-v1.0.85), source `2634905bd0d0791f99873379aee9c2c69cc65d9e`. Its Ed25519 authority and capsule remain byte-for-byte unchanged; no signing or runtime trust-policy change is involved.

|File|Bytes|SHA256|
|---|---:|---|
|ApolloUniversalPiUpdater-1.0.85-linux-arm64.zip|297811|`a55ca8cda6e5f124664c4eebadcf8b3d3354d6c4586211af46d1ea2d087b0f23`|
|ApolloUniversalPiUpdater-1.0.85.authority.json|1169|`7b3a6a2d613764a79f1eee98991bf91ff65f5936075a0d788963831f065cefb2`|
|ApolloUniversalPiUpdater-1.0.85.controller-capsule.json|6655|`d9bf61b4b34526e4be89e551aa9b5e8f4a7fa1389f11f42f603061ca86ef3e21`|

Package qualification: https://github.com/gdowkpc/apollo/actions/runs/38982377166. No claim of physical RF qualification.
