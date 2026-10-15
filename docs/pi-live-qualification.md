# Mandatory Pi publication gate

New Pi installer records use `apollo-pi-installer-distribution-v2` and include
`live_qualification: {path, sha256}`. The path must be
`qualifications/<installer-tag>.live.json`. The required provenance CI check
verifies its dedicated Ed25519 signature, exact application/updater/installer
identity, owned registered RTL bench, preserved state, activated agent, real
server check-ins and reports, actual reboot and sustained progress in all
configured RF windows without new receiver errors.

The collector is maintained in the canonical Apollo source repository; see its
`docs/pi-live-release-qualification.md`. It creates evidence only after a complete
physical run. A human-written `pass: true`, customer report, simulated transport,
old queued report or unsigned JSON cannot satisfy this gate. The public schema
rejects extra private identity/location fields.

`policy/pi-live-qualification.json` contains only the trusted public key and
frozen fingerprints of existing published installer records and the current
stable pointer. Existing downloads are not re-signed or rewritten, and cannot
be republished through the new publisher. These exceptions cannot qualify a new
build or changed record. Review trust-key rotation and baseline-policy changes
as security-sensitive source changes; private keys must never enter this repo.

Publication sequence:

1. Build and separately qualify the candidate application and signed updater.
   Immutable application/updater assets may be staged first because the normal
   installer resolves them. Do not change the public download or stable pointer.
2. Assemble and hash the complete installer. On the registered owned RTL bench,
   run that exact installer, retry, observe real deliveries, reboot and repeat
   observations with the canonical collector.
3. Add its signed receipt, receipt digest, application provenance and v2 installer
   record in a reviewed PR. Run `node --test tests/pi_live_qualification.test.js`
   and `node scripts/validate_pi_live_qualification.js`. Required CI must pass.
4. From clean reviewed public main, create the canonical lightweight installer
   tag at that main commit. Run
   `node scripts/publish_pi_installer.js TAG /private/path/INSTALLER.zip`.
   This checks evidence and bytes before any GitHub mutation, uploads a draft,
   verifies its sole asset's digest and size, then publishes and checks
   immutability. A failed draft verification leaves publication held. Inspect any
   ambiguous final publication response before retrying.
5. Separately review public download catalog activation and stable promotion.
   Any changed Pi stable pointer must match a signed v2 installer and its exact
   tested updater version. Verify the public page and unauthenticated download.

Use this publisher for complete installers. Do not bypass it with direct release
uploads or remove required CI. Repository administrators can still change
policy or publish outside tooling; those actions require explicit owner review
and are not qualified by a green source-only check. A quiet bench holds the new
release until real evidence arrives; it does not justify synthetic observations.

The gate supplements existing native package, legacy rollback and receiver
qualification. RTL evidence does not qualify Airspy, KA9Q/SDRplay or scanner
hardware, every RF band, calibration or known-transmission accuracy.
