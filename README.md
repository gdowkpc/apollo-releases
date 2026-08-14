# apollo-releases

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

The sole `0.0.0-fixture.1` record is a nonproduction resolver fixture.  It is
not an installable Apollo release and contains no runtime payload.  It exists
only to qualify the live GitHub API/download behavior while Apollo node source
still has no production release-repository pin.
