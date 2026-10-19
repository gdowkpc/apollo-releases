# Proposed legacy dashboard bridge qualification

Status: review proposal and isolated validation prototype. Not enabled, merged,
published or imported by any release gate. No production receipt is supplied.

## Decision required

The current implementation in `scripts/validate_pi_live_qualification.js`
requires a changed stable target to match an independently qualified installer
and `record.updater.version === stable.minimum_pi_updater_version`.
`docs/pi-live-qualification.md` states: "Any changed Pi stable pointer must match
a signed v2 installer and its exact tested updater version." The later
`pi-qualification-scopes.md` adds v3 onboarding evidence without relaxing that
updater equality. An installer tested with updater 91 therefore cannot by itself
authorize a dashboard minimum of 85. This is an explicit security-policy change
requiring owner review, rather than a missing evidence field to work around.

## Proposed rule

Keep ordinary promotion validation unchanged. Add a second, explicit scope
`dashboard_bridge_compatibility`, authorized only through reviewed policy source.
Use the existing trusted owned-bench public keys with a separate Ed25519 domain
`apollo-pi-dashboard-bridge-compatibility-v1\n` and a closed canonical JSON schema.
The prototype implements signature/payload validation only; wiring is deferred.

The additional route would require both:

1. A normal, fully validated signed v3 physical installer/onboarding record for
   the exact target application, source, complete installer and newer updater.
   Preserve actual installation/retry, state preservation, physical reboot,
   production authenticated check-ins, receiver progress and one-approval tests.
   For the current candidate this means Build 330/updater 91; these numbers are
   not exemptions or constants in the proposed validator.
2. A separately signed native legacy compatibility receipt bound to that exact
   target and exact normal onboarding receipt digest. Require every immutable
   signed updater distributed in the advertised minimum-to-new-installer range,
   not just whichever oldest updater happens to pass. Each version is bound by
   package and capsule digest. The minimum itself must appear. At least 85 and
   87 are needed for the present owners; independently enumerate intermediate
   published versions too. Evidence for 85 must never stand in for 87 or others.

The expected updater inventory must come from independently verified immutable
release authority, with its complete inventory digest bound in the receipt.
It must not be inferred from receipt cases or a hand-entered per-build allowlist.
No inventory collector or real native compatibility signer exists in this
proposal: these are explicit implementation blockers before activation.

## What the legacy receipt must prove

Use an owned physical RTL bench and the original authentic application/installer
plus unchanged signed historical updater. A credential-free installation with
fixture registration is explicitly `fixture_existing_install`, reporting off,
and no production credentials or production mutations. Record its original
application/installer, baseline manifest, preservation manifest and logs hashes.
The baseline must be prepared using the authentic installer prerequisites,
never by deleting a failed transaction or weakening a receiver selection guard.

The one permitted seam is `private_descriptor_fixture`: bind its exact bytes
and target application hash. Real application provenance, immutable asset
downloads, signatures, TLS, systemd, root queue, process, USB and receiver-health
behavior are unchanged. All service/process/hardware/health/authority adapters
are rejected. Original frozen-dashboard HTTP discovery that cannot use this
fixture remains a distinct post-promotion smoke check, explicitly not certified
by this receipt. A direct helper call or no-device component test cannot qualify.

For each covered updater require native root queued activation, replacement by
the newer updater, sustained real receiver progress in every configured window
before and after a real container/system restart, forced activation failure
with rollback to original application/updater and recovered services, then a
successful retry. Bind separate transaction and log hashes. Preserve strict
node-owned bytes and UID/GID/mode across activation, rollback and retry: settings,
scan plans, credential/key/public identity and registration, including canonical
generated identity projection. The qualification fixture uses canonical pretty
JSON, so its projection remains byte-exact. Existing installations may regenerate
the read-only `/etc/apollo-node-agent/identity.json` projection from canonical
`receiver-config.node_configuration` under the already reviewed projection
contract: whitespace may change while UUID, schema, UID/GID and mode remain
unchanged. This is not a new identity migration or approval requirement. The
prototype's byte-exact fixture proof does not exercise that formatting case;
the separate identity-format diagnosis records it. Rollback must restore the
original projection's raw bytes. Canonical node configuration, credentials,
keys and public identity retain strict byte and metadata preservation.

Container restart is explicitly legacy compatibility evidence. It cannot replace
the independent normal installer receipt's physical reboot and authenticated
production check-ins. Both receipts keep live RF reporting explicitly pending;
receiver samples and a quiet bench do not claim delivered organic RF reports.

## Integration to review next

- Define a deterministic `qualifications/<application-tag>.bridge.json` receipt
  location and a digest reference in a separate bridge record, without extending
  or weakening the existing strict stable advertisement schema.
- Resolve and validate the normal v3 installer first. Only if updater equality
  differs, require the opt-in scope, independently verified complete inventory
  and separately signed exact-target receipt. Missing, invalid, unsigned,
  incomplete or mismatched evidence fails closed. Ordinary equality continues
  to use the current validator and cannot require or borrow a bridge receipt.
- Validate all bridge records on CI, preserve `*.bridge.json` bytes with Git
  attributes, and add integration tests through the actual repository validator
  before importing the prototype. Bind the bridge record's receipt digest and
  exact normal onboarding receipt digest; reject path traversal and symlinks.
- Implement/review the collector in canonical source. It must collect actual
  observations, independently validate artifact authority and inventories, and
  sign only complete cases. Hashes or booleans manually assembled by an agent
  are not evidence. No real qualification signatures are generated here.
- Review the generic policy PR separately from application staging and promotion.
  Keep current Build 328/minimum 91 and all historical record fingerprints
  unchanged. After both evidence paths pass, review the new exact-target bridge
  record and stable advertisement. Then run the genuine owner HTTP update smoke.

The prototype tests use ephemeral keys and in-memory synthetic payloads only.
They exercise acceptance/rejection semantics and never create qualification
files. Passing them does not qualify any application, updater, installer or Pi.
