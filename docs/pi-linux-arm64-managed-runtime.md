# Apollo Passive Receive for Raspberry Pi / Linux ARM64

This download is the managed Apollo runtime for an existing approved
Raspberry Pi or other Linux ARM64 node. It is not a clean-image or bootstrap
installer.

Before applying it, confirm that the target is a supported ARM64 node and that
the installed Apollo service is healthy. Use the node's normal
owner-controlled managed-update procedure so the existing node identity,
configuration, and service wiring are preserved. Do not unpack the ZIP over
an arbitrary directory or use it to replace a clean Pi bootstrap flow.

After the controlled update, open the node's local dashboard and confirm the
reported version and build. For headless Pi nodes, use the published local
network address shown by Apollo; it normally has the form
`http://apollo-<callsign>-<number>.local`.

The GitHub Release is the authoritative source for the exact filename,
SHA-256, byte size, and release notes. Check those values before an update.
