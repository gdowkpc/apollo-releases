# Build 411 fresh-install publication scope

The exact installer passed a clean Raspberry Pi3B+ installation over Wi-Fi, a same-installer retry, configuration byte/owner/group/mode preservation, an actual reboot with automatic services, and Windows HTTP dashboard identity checks. The Pi remained unenrolled and receiver-free.

The prior publication families require registered-node/onboarding or RF evidence, or a maintenance revision with identical previously qualified application bytes. Build411 cannot truthfully use those labels. Distribution v5 therefore adds a fresh_install family with a domain-separated signature from the existing operator lab key and an explicit per-record release allowlist. It reuses only the unchanged signed updater116 reference from the qualified404 record. No new runtime trust key or node authority is introduced.

The exact allowlist binds application/source, updater, installer bytes and digest, launcher source and receipt digest. The signed proof requires an empty Apollo/Node/nginx baseline, successful install/retry/post-reboot exits, unchanged configuration ownership/mode/bytes, a changed boot fingerprint, all required active services, no registration credential, normal public authority and Windows HTTP build identity. Existing live/onboarding/maintenance validation remains intact. Fresh-install-only evidence is excluded from stable-promotion eligibility.

No registered-node recovery, backend check-in, RF/reporting or uncoached beginner-usability qualification is claimed. The builder cooling issue is separate and unresolved: its earlier sustained-load attempt exceeded the fixed75C test criterion at75.45C after195seconds, while sampled firmware flags were zero; cause was not established. This installer publication neither resolves that failure nor qualifies unrestricted builder health.

## Exact artifacts

- Installer: Apollo-Pi-Installer-2.3.198-build.411-updater.1.0.116-linux-arm64.zip,356271bytes,SHA2567942b7451d60a8aa7fdb3945b04d6451fcf244820f1eedad52b79a27c753d55e.
- Application:2.3.198/build411,sourcebcfca2de1ef27ff66c6eb7d0caaa12cd1c72575c,SHA2569675b1deb5ddf377b358249f71978d8b6758c7eb76d4f78f44fecfa534cf546b.
- Public signed proof: qualifications/apollo-pi-installer-v2.3.198-build.411-updater.1.0.116.fresh-install.json.

Publication uses the exact tested ZIP without rebuilding, recompressing or rewriting its assembly-time candidate metadata. The committed external qualification is the later proof. Publish with make_latest=false; portal/catalog, stable discovery and existing-card deployment remain separate and unchanged.
