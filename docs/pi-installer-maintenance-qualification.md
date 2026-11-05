# Installer-only maintenance qualification

The installer-maintenance scope replaces only a complete installer ZIP. It does
not publish a new application, updater, receiver backend or application update
pointer. The existing registered RTL/onboarding and live RF gates remain intact.

Each revision requires an explicit reviewed policy entry binding the exact new
installer SHA-256, byte size and merged launcher source, plus the path and LF
SHA-256 of a previously qualified, non-held installer record. The predecessor
must retain a valid existing onboarding or live-RF signature. Maintenance cannot
inherit from maintenance, held history, a different application or a different
updater. Every updater payload hash and all target fields must remain identical.

The archive comparator requires the same ZIP members, identical updater payloads
and metadata, unchanged existing activation functions, classes, globals/imports
and dispatch. Only static completion text, the reviewed support-report helpers
and their error-only hook, guides and package metadata may differ. A policy
entry is specific to the exact reviewed archive; the comparator is not an
automatic authorization for arbitrary future source changes.

The new exact installer has its own domain-separated Ed25519 maintenance
attestation. The existing operator qualification key signs it; runtime update
keys, source grants and account authority do not change. The receipt includes
retained private evidence digests and whitelisted physical facts: owned
unenrolled Pi, no receiver, exact installed target/updater, ordinary install and
retry success, unchanged configuration bytes, active required units, an actual
changed boot identity, post-boot browser success, no checked service errors and
SSH support details. The archive is verified before signing and again by the
canonical publisher before any GitHub mutation.

The receipt explicitly marks fresh-card, registered-node, backend check-in and
receiver RF testing as false. Prior qualified application/updater evidence is
referenced unchanged; it is never relabeled as a new test. Configuration-byte
preservation on this unenrolled Pi is not represented as a new registered-node
credential-preservation test. No sample counters, registration or check-ins are
fabricated. New application/updater bytes require the existing broader gates.

For Build398 installer revision3, the exact archive is
41278066c106c4311b381b06a0543680cb73be67526d4092d1f92b4977468a17
(352176 bytes), launcher f03a46c96a653b7822ae18c3355b4e91d762142b.
It inherits only the frozen revision2 record. Physical evidence was collected on
the existing no-receiver Pi; another fresh-card run was explicitly deferred by
the owner. The public record and deterministic release notes must preserve those
limits. No receiver must be connected just to install Apollo.

## Revision 4 beginner guidance

Revision 4 retains the frozen revision-2 application and updater baseline. The
comparison additionally admits only the exact reviewed newer-build help return
and conditional error-print block from source 9e87834b14c99b86e8b6f911fd66ce6f7ca672e2.
It does not ignore arbitrary print expressions, operations or predicates.
Changing the help text, adding an operation, changing a target/payload, or moving
the handler into the success path still fails. The exact archive remains bound
by its policy SHA-256 and byte count. Fresh-card, registered-node, backend and RF
claims remain false; the dashboard application change is outside this installer
maintenance receipt and is not delivered by this unchanged Build398 payload.
