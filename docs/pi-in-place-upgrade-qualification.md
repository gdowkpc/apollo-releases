# Pi in-place upgrade qualification

Before promoting a new stable Pi release, run the normal customer upgrade on a disposable copy of each tracked predecessor installation. The inventory covers Linux ARM Pi runtime provenance, installers and images, including historical releases. Add distribution records for shipped variants discovered outside this repository so their paths enter the inventory.

Start with a registered test node and a working scan plan. Trigger the upgrade once through the dashboard if it offers updates. For installations without dashboard updates, run the current signed complete installer against the existing boot card. Any intermediate updater installation must happen within that action. Reboot and record a successful scan on the new boot. Compare the effective registration and scan settings before and after. Hash normalized state that excludes counters, timestamps and secrets from the evidence. Retain sanitized run logs for review.

Submit `qualifications/pi-in-place-upgrade-build.<build>.json` with schema `apollo-pi-in-place-upgrade-v1`. Bind `target_sha256` and `installer_sha256` to the exact promoted runtime and installer. Key the `predecessors` object by the repository path to each predecessor distribution record. Each entry records:

- `predecessor_sha256`, `entry_point` (`dashboard` or `signed_installer`), `dashboard_available`, `in_place` and `operator_actions`.
- `before` and `after_reboot` with `build`, `boot_id`, `registration_sha256`, `scan_settings_sha256` and `last_successful_scan`. The post-reboot data also includes `booted_at`. Record timestamps as UTC ISO 8601.
- `results_sha256` for the corresponding sanitized run log.

CI validates the evidence and its artifact bindings. Collect the evidence on a Pi and review the underlying run logs before merging a stable promotion.
