# Install or update Apollo on Raspberry Pi

This download installs **Apollo 2.3.79 / Build 292** with signed updater **1.0.83**. It repairs older installation prerequisites, keeps the credential agent current and preserves your existing registration and settings. Use 64-bit Raspberry Pi OS based on Debian 13 (Trixie).

1. On your Pi, [download the complete installer](https://github.com/gdowkpc/apollo-releases/releases/download/apollo-pi-installer-v2.3.79-build.292-updater.1.0.83/Apollo-Pi-Installer-2.3.79-build.292-updater.1.0.83-linux-arm64.zip).
2. Extract the ZIP, open **Apollo-Pi-Installer**, then right-click inside the folder and choose **Open in Terminal**.
3. Paste `sudo python3 install.py --apply` and press Enter. If asked, enter your usual Pi password. Nothing appears while you type it; that is normal.
4. Keep power, internet and the receiver connected until installation completes. Open Apollo at your usual address, refresh and confirm **2.3.79 / Build 292**.

Keep your existing SD card and registration. Running the installer again verifies the installed version. If it stops, send support the line beginning **Stopped:** and keep your settings.

Older RTL settings without a saved hardware identity retain validated scan coverage and timing when one RTL receiver is detected. Hardware gain and calibration use automatic defaults; different saved identities and ambiguous hardware retain their selection safeguards.

SHA256: `c7c1cf90a45b8ef0a8a75c244f280e80fb53871ff1ea59cbf3b10a02982e0000`

Size: 302,601 bytes. [Release notes](https://github.com/gdowkpc/apollo-releases/releases/tag/apollo-pi-installer-v2.3.79-build.292-updater.1.0.83).
