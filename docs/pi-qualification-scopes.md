# Pi installer qualification scopes

The owner authorized independent installer/onboarding and live RF qualification
on 2026-10-18. Both use the existing trusted owned-bench signing key and exact
installer, application and updater identities. They use different signature
domains and closed payload schemas.

- Existing v2 installer records keep their full live RF requirement unchanged.
- A v3 `installer_onboarding` record requires signed installation/retry/state
  preservation, real reboot, fresh authenticated check-ins and sustained receiver
  processing across every configured window before and after reboot. Its
  committed one-approval integration and runtime tests must pass against
  disposable storage and matching source. Test source, runtime inventory and
  logs are hashed in the attestation.
- V3 records must state `live_rf_reporting.qualified: false` with reason
  `separate_live_rf_qualification_required`. Phase reports are null. Publication
  and a matching stable update pointer may proceed under this explicit scope;
  release notes must say that live RF reporting qualification remains pending.
- Full live RF qualification still requires new real observations and server
  receipts in both phases. Quiet processing, check-ins, onboarding fixtures or
  an onboarding signature cannot substitute for that proof.

Neither scope changes receiver detection, sampling/error checks, production
authentication, node ownership, Live authority, observation quality, review or
directory rules. Historical frozen records and their existing hash exceptions
are preserved. No new per-release bypass or unqualified allowlist is added.

Installer-only corrections may retain the immutable application and signed
updater while setting `installer_revision` to an integer of at least 2. The
release tag and ZIP filename must include the matching `-revision.N` suffix.
An omitted revision keeps the historical names unchanged. Each changed ZIP
requires its own exact-artifact signed qualification and publication record;
an earlier installer's evidence cannot qualify different bytes. Revisions do
not replace published assets, change application build ordering, or relax any
installation, preservation, reboot, check-in or receiver-progress requirement.
