# Pi promotion requires the qualified updater

New Pi machine-update pointers use `apollo-stable-release-v2` with required
`minimum_pi_updater_version` of at least `1.0.82`. Older exact v1 parsers reject
the extended contract rather than ignoring the minimum. Windows stays on v1.

CI permits the exact currently held v1 Pi pointer unchanged during rollout.
Any content change to that legacy pointer must use v2 and bind the target to
qualified immutable provenance. A new v1 build, a missing/invalid minimum, an
older minimum, or mismatched target metadata fails publication validation.

Deploy in this order: merge the reviewed application support; build and qualify
the application with unchanged signed updater 1.0.82; publish and qualify the
complete installer; then promote the v2 pointer. Installing source support alone
does not change older clients. Those clients need the complete installer; their
old UI may show a generic unavailable update check when it encounters v2.

The new privileged dashboard worker checks its private installed-updater receipt
before preflight, independently re-resolves the public requirement before
preflight and apply, and stops stale/weakened requests. Failed requirements direct
the updated dashboard to the existing downloads portal. It does not expose
private updater files or change receiver settings, credentials or reporting.

This PR adds the publication guard and leaves the live held target, application
assets and customer installer unchanged. Publication and physical qualification
remain separate gates. Already-running older jobs are not retroactively changed.
