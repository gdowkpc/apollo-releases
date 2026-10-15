# Update Apollo on your Raspberry Pi

For an existing Apollo installation, including **2.3.54 / Build 267**, that cannot install updates or previously stopped with a permissions, receiver-selection, prerequisite or credential-ownership error.

Use this complete **2.3.78 / Build 291** installer with signed updater **1.0.81**. It preserves your existing settings and registration. Keep your SD card and leave your RTL-SDR, internet, and power connected.

## Download and install

Perform these steps **on the Raspberry Pi**, using its desktop:

1. [**Download the Apollo Pi installer**](https://github.com/gdowkpc/apollo-releases/releases/download/apollo-pi-installer-v2.3.78-build.291-updater.1.0.81/Apollo-Pi-Installer-2.3.78-build.291-updater.1.0.81-linux-arm64.zip).
2. Find the ZIP in Downloads, right-click it, and choose **Extract** or **Extract Here**.
3. Open the extracted **Apollo-Pi-Installer** folder. You should see **install.py**.
4. Right-click inside that folder and select **Open in Terminal**. Paste this command and press Enter:

```sh
sudo python3 install.py --apply
```

If asked, enter your Pi login password. Nothing appears while typing it; that is normal. Keep the Terminal open and power connected until installation finishes. Allow several minutes.

Open Apollo using your usual address and refresh the page. Confirm **2.3.78 / Build 291**, then reply to support to confirm completion. The normal dashboard update option should be supported.

If you cannot find **Open in Terminal**, or are uncomfortable with these steps, ask the person who sent this guide for help. A browser on another computer does not provide a Terminal on the Pi.

## If you need help

If the installer stops, send support only the line beginning **Stopped:** or the final error line. A message that it cannot open **install.py** means the Terminal is in the wrong folder; return to step 4.

Keep your existing settings and SD card. Do not reset, re-register, erase the operating system, edit files, or try another repair command. Do not send passwords or configuration files.

An account or reporting authorization message is separate from installation; this installer does not grant account or reporting permission.

## Download details

Requires 64-bit Raspberry Pi OS based on Debian 13 (Trixie), with Python 3. This is the immutable installer offered on the [Apollo downloads page](https://www.repeaterbooklive.com/apollo/downloads/).

Filename: **Apollo-Pi-Installer-2.3.78-build.291-updater.1.0.81-linux-arm64.zip**

Size: **301,434 bytes**

SHA-256: `fa23b5a66735395aa70b37addaaba6aed7c4d77f0890f3ab263f815cbe4cbf6b`

The exact ZIP passed an isolated Build 267 preservation and rollback fixture and installation, repeat installation, sampled RTL-SDR acquisition, and reboot checks on an owned Pi 3B+. Successful installation on your Pi is confirmed when you complete the steps above.
