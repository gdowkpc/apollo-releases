# Install Apollo on a Raspberry Pi

Apollo uses your receiver to listen for local radio activity and help RepeaterBook.

## Before you start

You need a Raspberry Pi running **64-bit Raspberry Pi OS or Debian ARM64**,
Python 3, internet access, reliable power, and a receiver supported by the release
you download. Check the receiver information on the
[Apollo downloads page](https://www.repeaterbooklive.com/apollo/downloads/).

For SDRplay, the current automatic Pi receiver profile is for the **RSP1B** and
requires the SDRplay API service. Installing SDRconnect alone does not establish
that Apollo supports your model. RSP2 support has not been qualified; contact
support before trying to use an RSP2 with Apollo.

You do **not** need to install Node.js, npm, or nvm yourself. The installer checks
Apollo's system packages and installs missing ones. If you already use nvm, keep
it: Apollo's background services use a separate system Node at /usr/bin/node.
The installer does not remove your nvm installation or upgrade the operating system.

## Install

1. Download the **complete Raspberry Pi installer ZIP** from the
   [Apollo downloads page](https://www.repeaterbooklive.com/apollo/downloads/).
2. Extract the ZIP. Open a terminal in its **Apollo-Pi-Installer** folder, where
   you can see the file **install.py**.
3. Keep power and internet connected, and run:

   ```sh
   sudo python3 install.py --apply
   ```

The installer checks the download, installs Apollo and its background services,
and reports when installation is complete. An existing Apollo installation keeps
its registration and settings. Installation does not approve a node for reporting.

## Open Apollo and finish setup

1. On the Pi, run `hostname -I` to find its local IP address.
2. In a browser on the same network, open **http://YOUR-PI-IP/**, replacing
   YOUR-PI-IP with that address. Confirm the build shown matches your download.
3. For a new node, choose **Connect to RepeaterBook**, sign in, and complete the
   receiver and location checklist. Existing owners should keep their registration.
4. Follow the setup status for receiver readiness and administrator approval.
   A running service alone does not prove reception or reporting is ready.

## If installation stops

Keep your SD card, registration, and settings. Save the displayed error code and
the last installation phase for support. You do not need to start by reimaging
the card or installing more software.

If the installer prints a private **command.json** path, retain that file. It can
contain credentials or other private information; share only a redacted copy with
support. Never post passwords, tokens, or credential files.

If installation stops at **Verifying Apollo's browser gateway**, include that
phase in your report. That check concerns the local web configuration; a receiver
name in the diagnostic command does not establish a receiver or driver failure.
Do not edit nginx files or remove services to bypass the check.

An optional download verification command is
`python3 install.py --verify-only`. It requires Node.js to be available already
and does not install Apollo or missing packages. Most new users should use the
installation command above.
