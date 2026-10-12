# Restore Apollo updates on your Raspberry Pi

For an existing **Apollo 2.3.54 / Build 267** installation that reports an available update but cannot install it because the updater or its services are missing.

This uses the published **Apollo 2.3.72 / Build 285** installer. It checks your existing installation and uses Apollo's normal update process to preserve your settings and registration. You do not need to erase the SD card or register the node again.

## Before you start

Keep the Pi connected to power and the internet, and leave your receiver connected. Apollo may briefly stop while it updates.

These steps must be performed **on the Raspberry Pi**, using its desktop and Terminal. A browser displaying Apollo on your Windows PC, Mac, or phone does not provide a terminal on the Pi. If you cannot access the Pi's desktop or are uncomfortable with these steps, reply to the person who sent you this guide and ask for help before continuing.

## 1. Download the file on the Pi

[**Download the Apollo Pi installer**](https://github.com/gdowkpc/apollo-releases/releases/download/apollo-pi-installer-v2.3.72-build.285/Apollo-Pi-Installer-2.3.72-build.285-linux-arm64.zip)

The file is named `Apollo-Pi-Installer-2.3.72-build.285-linux-arm64.zip`. It will usually appear in your **Downloads** folder. Downloading and extracting it does not change Apollo.

## 2. Extract the ZIP

Open the Pi's file manager and find the downloaded ZIP. Right-click it and choose the option to **Extract** or **Extract Here**. Open the extracted `Apollo-Pi-Installer` folder. You should see a file named `install.py`.

## 3. Open a terminal in that folder

In the file manager, use **Open in Terminal** for the folder containing `install.py`. Depending on your Pi desktop, this may appear in the right-click menu or a menu at the top.

If you cannot find this option, stop and ask for help rather than trying commands in an unrelated folder.

## 4. Run this one command

Copy and paste the following line into the Pi's terminal, then press **Enter**:

```sh
sudo python3 install.py --apply
```

If asked for a password, enter your **Pi login password**. Nothing will appear while you type; that is normal. Press Enter afterward. Enter the password only on your Pi; do not send it to support.

Keep power connected and leave the terminal open until the command finishes. It downloads Apollo, verifies the signed updater and application, checks your existing installation, and applies the update. Allow several minutes.

## 5. Confirm completion

Look for:

```text
Apollo installation completed. Open Apollo and confirm Build 285.
```

Open Apollo using your usual address and refresh the page. Confirm **2.3.72 / Build 285**. The update status should no longer say installation is unsupported; if another update is available, the normal update option should be available.

Reply to support with **"Updated successfully to Build 285"** when complete. You do not need to change your scan settings as part of this repair.

If Apollo still says **"Node Not Authorized"**, tell support. That is a separate account/node authorization message; installing the updater does not grant account or reporting permission.

## If it stops or you need help

If a line starts with **Stopped:**, send support that line or a photo of it. If you see `can't open file 'install.py'`, the terminal is in the wrong folder; return to step 3. For any other error, send the final error line and stop.

Keep your existing settings and SD card. Do not reset or reinstall the operating system, delete files, or try a different repair command. An unexpected or partially installed updater needs support review; this installer will stop rather than overwrite it.

Do not send passwords, tokens, configuration files, or a full diagnostic archive. The short error line is enough to start troubleshooting.

## Download details

The download requires 64-bit ARM Linux and Python 3. It is the same immutable installer offered on the [Apollo downloads page](https://www.repeaterbooklive.com/apollo/downloads/), not the older Build 279 repair candidate.

Filename: `Apollo-Pi-Installer-2.3.72-build.285-linux-arm64.zip`  
Size: **296,823 bytes**  
SHA-256: `88d304967dc72fcc5008774681272af9039c1ab1d3139617f95138617f593530`

An existing-installation update uses Apollo's authenticated configuration preservation and rollback process. Successful installation on your particular Pi is confirmed only when you complete step 5.
