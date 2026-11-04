# Install Apollo on a Raspberry Pi

You can install Apollo without knowing Linux. The steps below use the Pi's own
desktop and one command. If Apollo is already installed, keep your SD card,
registration and settings; do not start over by reimaging it.

## 1. Check your Pi and receiver

Use the operating system listed on the
[Apollo download page](https://www.repeaterbooklive.com/apollo/downloads/#platform-raspberry-pi):
currently **64-bit Raspberry Pi OS based on Debian 13 (Trixie)**, with Python 3.
A 32-bit operating system cannot run this installer. Keep power, internet and
your supported receiver connected. Check the exact receiver model on the download
card; support for one model does not mean every model from that maker is supported.

You do not need to install Node.js, npm or nvm. Apollo installs its missing system
packages. If you already use nvm, keep it; Apollo's background services use system
Node separately. The installer does not upgrade your operating system.

For SDRplay, the current automatic profile is **RSP1B**, with the SDRplay API
service required separately. SDRconnect alone does not establish compatibility.
RSP2 reception has not been qualified. Contact support before using an RSP2.

## 2. Download and extract on the Pi

1. In the Pi's web browser, open the
   [Apollo download page](https://www.repeaterbooklive.com/apollo/downloads/#platform-raspberry-pi).
2. Expand **Raspberry Pi** and click **Download Installer**. Use the complete
   installer ZIP, rather than an older application-only ZIP.
3. Open **File Manager**, then **Downloads**. Right-click the downloaded ZIP and
   choose **Extract Here** (or open the archive and choose **Extract**).
4. Open the extracted folders until you see **install.py** and a **payload** folder
   together inside **Apollo-Pi-Installer**. Keep the whole folder together.
   Do not run install.py from inside the unopened ZIP or move it out by itself.

Newer downloads also include **READ-ME-FIRST.html**; open it in a browser if you
want these instructions beside the installer.

## 3. Run the installer

Inside that Apollo-Pi-Installer folder, right-click an empty area and choose
**Open in Terminal** or **Open Terminal Here**. On desktops that put this action
in the menu, use **Tools > Open Current Folder in Terminal**. This opens the
command window in the correct folder.

Copy this entire line, paste it into that window, and press **Enter**:

```sh
sudo python3 install.py --apply
```

If a password is requested, use the password you created for the Pi. **Nothing
appears while you type the password**; that is normal. Press Enter when finished.
This is your Pi password, not your RepeaterBook password.

Leave the window open and keep power and internet connected. Package downloads
can take several minutes. Wait for **Apollo installation completed**. If you see
**Stopped**, installation did not finish: use the help below before proceeding.
A running service or an nginx welcome page is not the completion check.

## 4. Open Apollo

On the **same Pi**, open its web browser and type this into the address bar:

**http://localhost/**

You should see Apollo / RepeaterBook Live, with the build matching your download.
**Welcome to nginx is not Apollo.** If you see that page, installation is unfinished
or the local web page needs recovery. Keep the installer window and use the help
below. RepeaterBook's public website is separate from your Pi's local dashboard.

For a new node, choose **Connect to RepeaterBook**, sign in with your RepeaterBook
account, and complete the receiver and location checklist. Submit the setup for
administrator review and leave the Pi running. Existing owners should keep their
registration. Installation alone does not approve reporting.

## If something goes wrong

- **install.py cannot be found:** open the extracted Apollo-Pi-Installer folder
  containing install.py and payload, then open Terminal from that folder.
- **ENOENT / a required file or command is missing after installation starts:**
  save the last phase and stop code. The code alone cannot identify what is missing.
- **Welcome to nginx / Apollo does not open:** run the same installer once more.
  If it stops again or still shows the welcome page, contact support with the
  last phase and stop code. Do not delete nginx files or remove services yourself.
- **Waiting for approval:** finish and submit the dashboard checklist, leave the
  Pi running, and follow the displayed status.

For help, include the installer build, Pi model, receiver model, last phase,
stop code and exact browser message. A photo of the final installer screen is
useful. Use the [Apollo community](https://repeaterbook.groups.io/g/apollo) or
reply to the support conversation where you received these instructions.

If a private command.json path is displayed, retain that file. It may contain
credentials; share only a redacted copy privately with support. Never post
passwords, tokens or credential files. Keep your registration, settings and SD card.

## Optional: open Apollo from another computer

Keep both devices on the same network. In a terminal on the Pi, run
`hostname -I` (capital I) to see its addresses. Open the local address in your
other computer's browser, for example **http://192.168.1.42/**. Use your Pi's
actual address; the example is not an address to copy. On a different computer,
localhost refers to that computer, so use the Pi's network address instead.
