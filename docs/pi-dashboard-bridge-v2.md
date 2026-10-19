# Dashboard bridge v2: native prerequisites and public delivery

This is source preparation. No candidate, collector approval, signed receipt,
probe authorization or release advertisement is included. Existing v1 readers,
held fingerprints, normal installer policy and the stable descriptor retain their
original bytes and behavior. The default v2 policy approves no collector and
disables public probes. Live RF reporting remains a separate qualification.

## Three distinct results

`validateNativeRecord()` reads a
`bridge-candidates/<application-tag>.native.json` record. Its status is always
`native_prerequisites_only`. It cannot satisfy the ordinary stable gate.
It revalidates the exact normal onboarding signature, immutable signed updater
inventory, target identities and approved collector manifest. Required versions
come from the complete inventory below the normal installer updater, never from
the cases a runner happened to produce. No release, build, source hash or version
hole grants an exemption. The existing inventory reader is unchanged.

The native contract requires both `original307_unbound` and
`healthy_observed331_bound` families for every required historical SDK. These
names describe authentic retained fixture lineages, not a runtime exemption for
an installed build. Original307 cannot claim baseline receiving health; the
healthy331 fixture requires fresh private baseline processing. Each family has
separately imported activation/restart and failure/rollback/retry branches from
the same frozen baseline export. Their custody and lineage hashes are distinct.
Application/principal/source and the actual retained historical SDK are bound
in every phase. SDK replacement is a separate component operation.

Every positive case includes all five ordered native phases and every declared
native refusal family. Restart uses exact bound configuration preservation even
when activation performed first binding. Forced failure includes one successful
target stop and settlement of its one-shot helper before rollback/retry. An
untriggered, failed or lingering fault helper cannot supply rollback proof.
Healthy phases reuse the v1 complete-window, zero-error, two-minute sustained
processing validator. They do not require a new live RF report.

`validateRepositoryProbe()` is a separate guarded-publisher entry point. It
revalidates the ordinary repository and the complete native candidate before
calling `validateProbeEligibility()`. It does not mutate any file, publish a
catalog, launch a supervisor or turn native evidence into final eligibility.

`validateFinalRecord()` is dispatched only for the exact final v2 schema in
`bridges/`. It requires the complete native record, a signed successfully
restored real-public probe outcome, original dashboard owner HTTP evidence,
and a separately bound audit of the whole delivery contract. V2 failures never
fall back to v1. The final record can satisfy the existing exact-target bridge
gate only after that validation. Native-only records stay outside its directory.
Normal source merge and final permanent promotion remain separate approval steps.

## Preservation and the audit boundary

The collector must retain all six raw protected files, original presence and
UID/GID/mode, duplicate-free private JSON, transaction inventories and full
source replay inputs. The public contract binds their manifests and reports;
it does not reconstruct secret bytes from hashes. Four restricted files,
custody, complete owner choices, neutral fields, location, registration and full
identity must remain equal. Ordinary bound configuration remains byte exact.
Refusal and rollback require exact raw state, including identity projection.

For neutral first binding only, the replay binds the actually installed signed
historical SDK archive/authority/capsule, target manifest/principal/detector/starter,
before configuration, complete expected configuration, measured serial and
hardware identity, producer and context. The complete after-configuration digest
must equal independently produced expected bytes. The audit must verify SDK
bytes **before loading installed JavaScript**, actual current hardware, the whole
configuration Buffer and every classified semantic delta. Actual-after bytes
must never be supplied as expected input. Unknown fields are not waived.
The identity exception permits only unchanged closed full identity equal to
canonical configuration identity, unchanged custody, and the exact reviewed
source renderer's output bytes. Semantic-equivalent arbitrary formatting fails.

The native contract also requires a separate authentic target-registered-unbound
first Save constructor, actual GET/Save/recheck and post-Save progress. It cannot
borrow an already-bound branch. For every historical SDK, a separate same-app
component request must install the normal signed updater with pointer/receipt
evidence and preserved application/state. `dashboard_update_not_newer` after
component completion is not another successful application transaction, nor
proof of automatic component installation by original307.

Collector manifests are exact-hash approved in `policy/pi-dashboard-bridge-v2.json`.
Each approval pins collection source, producer and actor plus separately reviewed
audit source, producer and actor. Those identities must correspond to real
retained custody/review records. The audit actor must differ from the collection
actor. Audit signatures bind the complete native/delivery contract and retained
raw/replay evidence. The existing authorized owned-bench key may sign both
domains. **Key count does not establish review independence.** No second private
key is required or created by this policy. A signature authenticates the trusted
collector's assertion; actual separate raw-evidence review supplies independence.
Changing supplied hashes consistently cannot be detected without that review.

Signature domains are UTF-8 prefix plus canonical payload:

- `apollo-pi-dashboard-bridge-native-v2\n`
- `apollo-pi-dashboard-bridge-compatibility-v2\n`
- `apollo-pi-dashboard-bridge-independent-audit-v2\n`
- `apollo-pi-dashboard-delivery-probe-execution-v2\n`

Their envelope schemas use the corresponding prefix followed by
`-attestation-v2`. V1 envelope domains and schemas are unchanged. New v2 file
references reject traversal and parent/file symlinks and bind exact raw hashes.
New referenced v2 JSON is canonical, optionally followed by one LF; signed
payloads are canonical without a trailing LF. Duplicate payload/record keys fail.
Existing installer/inventory formatting retains its current rules.

## Public-probe execution is deliberately not enabled

Original307 uses the fixed global GitHub `main` catalog and validates it twice,
around its preflight. The probe is real advertisement to every eligible client,
not a node-only canary. Caches and queued clients can outlive restoration. A
restore cannot downgrade nodes or prove global expiration. If possible customer
action is forbidden, public delivery proof stays blocked.

The closed probe plan binds the exact native record/evidence, requirements,
collector, target, existing-schema descriptor/preimage digests, original main,
restore code/preimage, fixed endpoint, fresh nonce and immutable UTC window.
Its ceiling is at most 1,800 seconds, and each operation needs a shorter or equal
explicitly approved measured bound; this policy does not itself approve a run.

The guarded publisher must independently authenticate direct human approval of
the exact plan, policy, publication and restore revisions and all enumerated
global/cache/queued-action risks. It supplies that trusted context separately
from the plan, plus fresh current main/preimage, exclusive lease, unused ledger
and monotonic elapsed observations. A signed prearmed supervisor receipt must
bind matching approvals/heads/code, a real write probe, CAS preimage, ownership,
heartbeat and the unextended deadline. A plan flag cannot supply these facts.
Qualification signing authority does not grant publication authority.

There is intentionally no automatic call from the normal repository/CLI stable
validator to this temporary eligibility entry point. A reviewed publisher and
independent restore supervisor implementation, with actual authorized control
transport, must integrate it **before** any probe publication merge. A plain
native candidate or plan therefore still fails the normal stable gate. This
integration is an unresolved execution requirement, not completed qualification.
No CI bypass, broad floor downgrade or deployment adapter is added here.

Keep the candidate catalog through the original worker's second validated fetch.
Restoring during preflight may produce `dashboard_update_target_changed` and is
a failed probe. Early restore requires retained original worker trace and an
independent audit that subsequent explicit-tag SDK application uses immutable
authority rather than the catalog. Completed evidence requires actual approved
publication/restore heads and distinct merge SHAs, ordinary HTTPS observations,
causal second-check trace, successful exact CAS restoration, bounded wall and
monotonic exposure, and explicit residual-exposure disclosure. Failed, late,
conflicting or missing restoration cannot produce final delivery eligibility.

For final historical verification, source-reviewed
`policy/pi-dashboard-probe-authorizations.json` pins the canonical plan digest
to the separately retained direct-approval context and supervisor identity.
The map is empty here. Adding an entry or enabling a probe requires its own
concrete exact-head review; a signed outcome cannot approve its own operation.
No self commit/file hash is embedded in the object being hashed.

## Remaining work and scope

The tests use synthetic documents and ephemeral keys only, in temporary roots.
They establish reader behavior, not installation, hardware, native progress,
owner HTTP delivery or successful recovery of VE7LOG-1 or WH6DLQ-1. Real approved
collector identities, complete matrix runs, private raw/replay audits, guarded
publisher/supervisor integration and actual customer updater inventories remain
required. Original307's hidden update controls also require a separately proved
owner-accessible path. Public delivery fixtures cannot resolve an unknown
customer installation. Neither this source change nor a later fixture pass
establishes live RF reporting or map visibility.
