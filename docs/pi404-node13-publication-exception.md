# Build 404: preserve Node 13 and disclose the fresh-card gap

## Decision and authority

On 2026-11-05 the owner requested completion of publication using Node 13
without wiping its working card because no fresh test card is available.
This release-specific exception takes effect only with the owner's exact-head
approval of the PR introducing it. It does not amend the ordinary fresh-card
requirement for other releases. The existing publication-only allowance covers
subsequent provenance, installer and catalog work with unchanged frozen bytes.
All normal publication checks must still pass.

## Exact scope

- Application: 2.3.191 / Build 404, source 37a40043f8c0ba385f85b77b9654936a87f5721b.
- Application ZIP SHA-256: 2e5e1d283d7638b2f8cbf6471d1ff748966d246567473a8ebaedbafddc4d8fa5.
- Signed updater: 1.0.116, ZIP SHA-256 f9cdb7bb1e6be352f69866823d0b7c9a17457c0d2eac92e5fe2cd15558446ac7.
- Complete installer: Apollo-Pi-Installer-2.3.191-build.404-updater.1.0.116-linux-arm64.zip, 356623 bytes.
- Complete installer SHA-256: fcc7ea79f11083076768e1bd4179555f7a7216084ffaab9726524c3e69cac606.
- Signed onboarding receipt: qualifications/apollo-pi-installer-v2.3.191-build.404-updater.1.0.116.onboarding.json in gdowkpc/apollo-releases.
- Exact signed receipt SHA-256: 6c7fa9359764fa6ebce34d4661dfc1acf04bd835185399e2983ecb153fea3866.
- Receipt archived by public PR #286, merge 3db7ecee05cf4cdd9f7b453a4cc880be8dd46125.

No rebuild, re-signing, launcher substitution or receipt editing is authorized
by this exception. Only this exact installer may be promoted with its retained
registered-node receipt. It may advance Pi stable discovery to Build 404 with
minimum updater 1.0.116 and the Pi download catalog after publication and
anonymous asset verification. Other platforms and held successor builds are
outside this scope.

## Evidence accepted and evidence absent

The exact complete installer passed ordinary forward installation on the owned
registered Node 13 from private Build 403, with protected bytes, ownership and
modes preserved. Its canonical retry, actual reboot, fresh authenticated backend
check-ins and three timed processing samples across both configured windows on
each boot passed. Isolated onboarding checks passed (57 server checks and 84
x64 runtime checks; ARM64 83 with one declared x64-only skip). Reporting was
restored off through the ordinary preference API. The signed receipt is retained
unchanged and remains scoped installer_onboarding, with live_rf_reporting false.

No freshly imaged baseline, prerequisite installation from a clean OS, fresh
unenrolled setup, or beginner browser exercise was tested for these exact bytes.
Existing dependencies or state on Node 13 can conceal clean-install defects.
Neither a container rehearsal nor an artificial cleanup of Node 13 would supply
that missing physical proof. Public qualification text and release notes must
explicitly disclose the fresh-card exception; they must not label that test passed.

The original installer remains immutable. Later merged launcher work improves
newer-build refusal messages and the Windows installation guide; its reviewed
apollo_pi_install.py change does not alter activation logic. The current online
guide should remain available, including the instruction not to retry an older
installer against an installed newer build. Do not replace the frozen launcher's
bytes under this qualification.

## Preservation and reboot limits

Do not wipe, repartition, clean, unenroll or recreate Node 13. Preserve its
identity, credentials, settings, queues, reporting choice and rollback evidence.
No additional Node 13 installation or reboot is needed solely to replace the
missing fresh-card gate. Any later mutation requires ordinary identity and state
revalidation; stale evidence is not authority to restore an unexpected state.

The shipped recovery files retain the prior remote USB port-power qualification:
one automatic reboot after prolonged absence, then continued absence and a
watcher restart without another automatic reboot. Mechanical unplug, a physical
network outage, the full six-hour hardware cooldown and thirty-minute hardware
rearm were not tested; retain their existing evidence limits. Network failure
alone cannot trigger a host reboot. Host reboot remains root opt-in for dedicated
hosts and off by default, including shared AllStar hosts. This exception changes
no runtime latch, retry budget, absence threshold, health gate, trust anchor,
authentication, rollback or reporting authority.
