# Dashboard bridge compatibility gate

This is an additional qualification route for an exact target application whose
normal complete installer uses a newer updater than the dashboard's advertised
minimum. It preserves the ordinary exact-updater installer route, all historical
fingerprints and the existing stable advertisement schema. No build number or
source hash grants an exemption. `dashboard_bridge_compatibility` is an explicit
reviewed policy scope with the existing owned-bench public signing keys.

Every committed `bridges/*.json` record is validated, even if the current stable
pointer uses the ordinary route. A different stable minimum is accepted only
when an exact-target bridge record passes all checks. No bridge records or real
bridge receipts are added with this policy implementation. Existing public
stable targets and customer installations are not changed.

## Required independent evidence

1. A normal signed v3 `installer_onboarding` record for the exact application,
   source, complete installer and newer updater, including actual owned-bench
   physical reboot and authenticated production check-ins. Existing validation
   is unchanged. Its activated agent digest also binds the legacy receipt.
2. A separately signed complete immutable updater inventory for the inclusive
   minimum-to-installer range. Each package/authority/capsule is independently
   checked using the unchanged canonical production trust anchor and verifier.
3. A separately signed native compatibility receipt covering every published
   updater in that interval below the normal installer's updater. This includes
   intermediate versions, not just the oldest or the two known owner versions.
   The receipt binds exact application/source/installer/updater, normal signed
   onboarding receipt digest and inventory file digest. Each native case binds
   historical updater package/capsule and fixture baseline artifact hashes.

All three signatures must validate independently under distinct domains.
Onboarding or live-RF signatures cannot be relabeled as compatibility evidence.
A qualified installer with updater 91 cannot stand in for evidence about updater
85. Missing, unsigned, changed or incomplete evidence blocks the bridge route.

## Repository records and signature domains

The closed bridge record schema is implemented in
`scripts/validate_pi_bridge_compatibility.js:validateBridgeRecord`:

- `schema_version`: `apollo-pi-dashboard-bridge-record-v1`.
- `release`: exact `expectedRelease()` identity from the normal installer.
- `installer_record`: `{path,sha256}` for the normal v3 installer record.
- `minimum_updater_version`: the proposed stable minimum.
- `updater_inventory`: `{path,sha256}` for the signed inventory.
- `compatibility_evidence`: `{path,sha256}` for the signed native receipt.
- `live_rf_reporting`: false, reason `separate_live_rf_qualification_required`.

Paths are canonical and closed: `bridges/<application-tag>.json`,
`qualifications/<application-tag>.bridge.json`, and
`qualifications/pi-updater-inventory-<envelope-sha256>.json`. Full file hashes
bind reference bytes, with no newline normalization. Parent or file symlinks
and traversal are rejected. Git preserves signed envelope bytes.

Inventory signature domain: `apollo-pi-updater-inventory-v1\n`.
Envelope schema: `apollo-pi-updater-inventory-attestation-v1`.
Payload fields: `schema_version: apollo-pi-updater-inventory-v1`,
`repository: gdowkpc/apollo`, UTC `collected_at`, `complete: true`,
`minimum_updater_version`, `maximum_updater_version`,
`collector_source_commit`, `manifest_sha256`, `log_sha256`, and `updaters`.
Each entry has exactly `version`, `package_sha256`, `capsule_sha256`.
The maximum is the normal installer's updater and must match its package hash.
The entire inventory predates the native qualification run.

Compatibility signature domain: `apollo-pi-dashboard-bridge-compatibility-v1\n`.
Envelope schema: `apollo-pi-dashboard-bridge-compatibility-attestation-v1`.
See `validateBridgeEvidence` for the exact closed payload and per-case fields.
Sign canonical UTF-8 JSON (`JSON.stringify` form) using Ed25519 over domain bytes
followed by payload bytes. Only trusted owned-bench keys are accepted.

## Native case collection contract

The native runner/collector must derive every payload field from retained raw
observations, not from human-written pass flags or this validator's test fixtures.
Do not sign until every version in the verified inventory has a complete case.
Retain raw logs, collection source identity and input/script/config hashes.

Each case uses the authentic existing installer/application and unchanged signed
historical updater in an owned, isolated installation. Label its baseline
`fixture_existing_install`, reporting disabled, without production credentials or
record mutations. Bind application/installer/baseline manifest hashes. The sole
allowed seam is `private_descriptor_fixture`, with exact descriptor bytes and
target application hash. All actual provenance/assets/signatures/TLS, native
systemd, root queued worker, physical USB and receiver processing remain real.
Service/process/hardware/health/authority adapters are explicitly rejected.

Collect the following actual observations per updater:

- A queued activation to the exact target application/activated agent and newer
  updater, with its actual transaction hash.
- At least three time-ordered samples spanning two minutes with accepted capture
  growth and sweep/time progress in every configured window, before and after
  an actual container or system restart. Hash the full receiver error counters;
  they must not change or reset within either phase. Window sets remain equal.
  Distinct boot fingerprints and nonoverlapping phases are required.
- A forced activation failure with actual rollback journal, restored original
  application/updater and recovered services, then a successful retry with a
  separate transaction. Preserve rollback evidence.
- Before/activated/rollback/retry hashes of the complete node-owned byte and
  UID/GID/mode manifest. Preserve settings, scan plans, configuration, credentials,
  keys, public identity and registration. No customer secrets enter the fixture.
- Baseline, preservation and complete native log hashes, retained privately for
  independent review. Public receipt schemas reject extra private identity data.

Every version also needs a distinct `unbound_upgrade` case for the authentic
registered-but-`setup_required` baseline. Do not invent before-upgrade RF progress
for an unconfigured receiver. Preserve before/upgrade state and configuration
hashes across the application transaction. A shared exact-target `initial_setup`
case then performs real target-dashboard initial Save with exactly one
serial-identified RTL, bound to one measured legacy upgrade's output config.
Measure its deliberate configuration change separately. Registration, neutral
choices and location hashes must remain equal across Save. Bind actual
upgrade/Save transactions, native observation digest, receiver identity hash and
real post-Save progress. This common target-code Save need not be repeated for
every historical updater without a differential reason.

Bind exact packaged-application safeguard-test evidence for missing or ambiguous
receiver, swap, calibration, manual gain and unknown bound fields. Label its
scope `exact_packaged_application_tests`, with application/source, receiver-config
and watcher hashes and test log digest. Also bind the actual no-device native
refusal as `direct_verified_package_component`; it cannot be relabeled as a
queued activation result. No new physical multi-receiver or calibration-injection
claim is required or inferred. Bound-baseline native evidence alone cannot
qualify unbound recovery.

Use a canonical pretty projection in the byte-exact qualification fixture. The
existing read-only identity projection may regenerate whitespace while preserving
UUID/schema/UID/GID/mode under its existing contract; this is not a new migration.
That formatting variant remains separate diagnosis evidence, not a claim made
by this byte-exact fixture proof. Rollback restores original raw projection bytes.

Legacy container restart does not replace the normal installer's physical reboot
and production check-in qualification. Direct helper/no-device tests and adapter
matrix tests remain separate partial evidence. The genuine frozen owner HTTP
discovery path requires its own post-promotion smoke; a private descriptor test
does not prove public discovery. Live organic RF reporting remains unqualified.

## Inventory collection

`node scripts/collect_pi_updater_inventory.js PLAN.json` performs read-only GitHub
enumeration with exhausted pagination, requires immutable non-draft/non-prerelease
releases and exact asset inventory, downloads unchanged artifacts, validates
production authority signatures, package hashes and all capsule historical
profiles with canonical source. Both canonical source and public collector
checkouts must remain clean at fixed commits. No TLS/signature bypass exists.

The private plan supplies `source_root`, a new `output_directory`,
`minimum_updater_version`, `maximum_updater_version`, and optionally
`qualification_signing_key`. Without that key it produces unsigned review
material only. A signing key must match exactly one existing trusted public key.
Never commit the plan, private key or private fixture evidence. Collection
emits a digest-bound manifest and verification log. It cannot sign native
compatibility evidence or substitute inventory verification for native tests.

Publication still requires review of exact policy, receipts, installer and target
records, normal protected CI and the existing immutable publication sequence.
