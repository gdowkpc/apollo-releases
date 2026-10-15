# Install or update Apollo on Raspberry Pi

This download installs **Apollo 2.3.78 / Build 291** with signed updater **1.0.82**. It checks missing prerequisites, preserves existing registration and private credentials, and corrects older RTL scan-plan migration.

1. On your Raspberry Pi, [download the complete installer](https://github.com/gdowkpc/apollo-releases/releases/download/apollo-pi-installer-v2.3.78-build.291-updater.1.0.82/Apollo-Pi-Installer-2.3.78-build.291-updater.1.0.82-linux-arm64.zip).
2. Open Downloads and extract the ZIP. Open the **Apollo-Pi-Installer** folder.
3. Right-click inside that folder and choose **Open in Terminal**.
4. Paste `sudo python3 install.py --apply` and press Enter. If asked, enter your usual Pi password. Nothing appears while you type it; this is normal.
5. Keep power, internet and your receiver connected until installation completes. Open Apollo at your usual address, refresh, and confirm **2.3.78 / Build 291**.

Keep your existing SD card and registration. Running the installer again verifies the installed release. Do not reset or re-register.

For older RTL settings without a saved hardware identity or serial, a unique detected RTL retains scan coverage, timing, thresholds and ignored frequencies. Hardware gain and calibration use automatic defaults. Different saved identities or ambiguous receivers retain their selection safeguards.

If it stops, send support the line beginning **Stopped:**. Keep your settings; do not edit files or send passwords or credentials. If an earlier updater 1.0.81 attempt already replaced your saved scan plan, contact support: this installer prevents that migration loss but does not overwrite later settings automatically. The private upgrade snapshot retains the original choices.

SHA-256: `eae62d5fce1aa8990428f49422b9475743db3c3420fd5d46e7a9349ab7c2f37c`

Size: 302,562 bytes. [Release notes](https://github.com/gdowkpc/apollo-releases/releases/tag/apollo-pi-installer-v2.3.78-build.291-updater.1.0.82).
