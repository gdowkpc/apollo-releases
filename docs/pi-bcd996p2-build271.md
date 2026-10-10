# BCD996P2 early-tester setup for Build 271

Apollo 2.3.58 Build 271 includes a Raspberry Pi BCD996P2 scanner profile. Connection, an assigned-frequency scan plan, wrong-model rejection and pause/resume were tested with the exact packaged application. Real tone reception, physical USB reconnect, reboot, installed reporting, co-channel RF behavior and digital reception remain pending. BCT15X qualification is deferred.

Use 64-bit Raspberry Pi OS / Linux ARM64 and the signed Universal Pi Updater **1.0.71** already provisioned on the node. Updater 1.0.70 rejects the new controller inventory. The application ZIP is not a standalone installer. The commands below assume the updater and its independently verified 1.0.71 authority file are present.

Connect the scanner using its USB serial interface or a suitable USB-to-RS-232 adapter. Match the configured baud rate to the scanner's remote-control port. The tested connection used an FTDI adapter at 115200 baud. Use the adapter's stable `/dev/serial/by-id/...` path; the adapter identity does not identify a particular scanner serial number. Apollo verifies the model through the scanner's MDL response.

Create a non-secret scanner JSON file, replacing the port and target assignments with the node's assigned plan:

```json
{
  "model": "bcd996p2",
  "port": "/dev/serial/by-id/usb-YOUR_ADAPTER",
  "baud_rate": 115200,
  "settle_ms": 1200,
  "hold_ms": 1500,
  "assigned_plan": {
    "schema_version": 1,
    "plan_id": "node-assigned-plan",
    "revision": 1,
    "targets": [
      {"assignment_id": "assigned-1", "state_id": "06", "repeater_id": "123", "frequency_hz": 146940000}
    ]
  }
}
```

The plan contains 1–1000 ordered entries with unique assignment IDs. An assignment associates an observation with the scan request; it does not prove which repeater transmitted. Model/port selection, hardware identity and the plan belong to the canonical receiver configuration.

For a clean node, preflight the authenticated scanner installation:

```sh
sudo node /opt/apollo-universal-pi-updater/current/scripts/apollo_universal_pi_clean_install.js \
  --updater-authority /path/to/verified-1.0.71-authority.json \
  --tag apollo-passive-v2.3.58-build.271 --runtime-user apollo \
  --scanner-config /path/to/scanner.json --preflight
```

Review the preflight result before applying. Use the same command with `--apply` in place of `--preflight` for the authorized installation. Do not run a legacy scanner worker and Apollo against the same serial port. Existing `rb-rig-agent-uniden.service` and `rb-rig-agent-uniden-scanner.service` must be disabled during migration; the scanner profile supplies dialout access and service conflicts. Migration is a separate node operation from downloading this release.

For an already managed Apollo node, preflight the update:

```sh
sudo node /opt/apollo-universal-pi-updater/current/scripts/apollo_universal_pi_update.js \
  --updater-authority /path/to/verified-1.0.71-authority.json \
  --tag apollo-passive-v2.3.58-build.271 --preflight
```

Review the result before replacing `--preflight` with `--apply`. A legacy scanner installation that is not admitted by the authenticated updater needs controlled provisioning/migration first. Do not bypass the updater by manually activating the ZIP or the retired stable-request/dashboard path.

After installing Build 271, a hardware change to the scanner uses the authenticated target command:

```sh
sudo node /opt/apollo-passive-receive/current/managed-release/pi_receiver_change.js \
  --scanner-config /path/to/scanner.json --confirm --preflight
```

Apply the reviewed result using `--apply` in place of `--preflight`. The owner dashboard can then change baud settings and load the assigned-plan JSON without changing the selected model or adapter. Owner provisioning and reporting authorization remain required for server delivery.

The scanner dashboard shows connection and plan progress. Quiet-channel progress is not reception proof. Tone and digital status are scanner metadata; the profile does not supply IQ, audio capture, spectrum, SNR/dBm or decoding confidence. Any advertised digital capability must still be qualified against a known signal and the scanner's actual installed upgrades. Apollo does not install scanner upgrades.

Exact application source: `8b84b17460f6bb109487c84b49f0bd32bfd26ab2`.

ZIP SHA-256: `eef0a288fc46c19683044543b8b894a75b0905ab1e916c4b8023596de28c87fa`.

ZIP size: 19,791,185 bytes.
