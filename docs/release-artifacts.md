# Release artifacts and verification

Future complete Pi installers and stable promotions require the
[signed owned-bench publication gate](pi-live-qualification.md).

Public, GitHub-authoritative provenance and immutable downloadable artifacts
for Apollo Passive Receive managed releases.

This repository contains no node credentials, private source, signing keys, or
production configuration.  A production release is valid only when its
reviewed provenance record, lightweight `apollo-passive-v*` tag, immutable
GitHub Release, and ZIP asset agree exactly.

`provenance/*.json` is checked by the required `provenance-validation` workflow.
Each record uses the strict `apollo-github-release-provenance-v1` contract,
including public-release repository identity, source commit, tag, platform,
architecture, package filename, byte size, SHA-256, and qualification evidence.

The `0.0.0-fixture.1` record is a nonproduction resolver fixture, not an
installable Apollo release. It contains no runtime payload and exists only to
test GitHub API and download resolution. For installation, follow the public
downloads page rather than fixture records.
