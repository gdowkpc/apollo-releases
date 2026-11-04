# Install Apollo on a Raspberry Pi

**You do not need a keyboard, mouse or monitor connected to the Pi.** Use your
Windows, Mac or Linux computer to install Apollo over your home network, then
open Apollo in that computer's browser. This is often called a headless setup.

Already using Apollo? Keep your SD card, registration and settings. **Do not
reimage a working Pi just to retry installation.** A receiver is optional during
installation; connect supported hardware and finish receiver setup later.

## Before you start

Use the hardware and operating system listed on the
[Apollo Pi download card](https://www.repeaterbooklive.com/apollo/downloads/#platform-raspberry-pi):
currently **64-bit Raspberry Pi OS based on Debian 13 (Trixie)**, with Python 3.
A 32-bit OS cannot run this installer. Keep the Pi powered and connected to the
internet. Your computer and Pi must be on the same local network.

You do not need to install Node.js, npm or nvm. Apollo installs its missing system
packages. Existing nvm installations can remain; Apollo services use system Node
separately. The installer does not upgrade your operating system.

Use the steps below for a Pi without a screen. If you already have a screen and
keyboard connected, use [the desktop alternative](#desktop-alternative).

## 1. Enable remote access

**Already connected to your Pi with SSH? Skip to step 3.** SSH opens the Pi's
command window on your computer. It does not require a desktop on the Pi.

For a new card, install [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
on your computer. Choose your Pi, the supported 64-bit Raspberry Pi OS and the
intended SD card. Writing an image replaces that card's contents; use a separate
card if you are keeping an existing installation.

Before writing the card, use Imager's customisation settings to:

- Set a hostname, and write it down. Use your own callsign and node number, for
  example apollo-w4jew-1. Your actual name will differ from this example.
- Create your Pi username and password, and keep them. There is no username or
  password shared by all Apollo users.
- Enter Wi-Fi details if you are not using an Ethernet cable.
- Enable SSH under Remote Access. Password authentication uses the Pi account
  you just created. If you already use SSH keys, you can keep using them.

Write the card, put it in the Pi, connect Ethernet if using it, and power on.
Allow several minutes for the first boot. These settings follow the
[official Raspberry Pi setup instructions](https://www.raspberrypi.com/documentation/computers/getting-started.html).

For an existing Pi with SSH disabled, use its existing remote-access method or
[the official instructions to enable SSH](https://www.raspberrypi.com/documentation/computers/remote-access.html#ssh).
Keep the existing card and account; do not reimage it just to enable remote access.

## 2. Connect from your computer

Open **Terminal** or **PowerShell** on Windows, or **Terminal** on Mac/Linux.
Run the line below after replacing BOTH uppercase placeholders:

~~~text
ssh YOUR_PI_USER@YOUR_PI_ADDRESS
~~~

YOUR_PI_USER is the Pi username you created. YOUR_PI_ADDRESS is the hostname
followed by .local, or the Pi's local IP address. For example, if your username
is alex and hostname is apollo-w4jew-1, the command is
ssh alex@apollo-w4jew-1.local. Use your own values; do not copy the example account.

If the name does not connect, find the Pi in your router's connected-devices list
and use its IP address instead. Example: ssh alex@192.168.1.42, with your own
username and address. An Ethernet connection can simplify initial setup.

On a first connection, SSH asks whether to trust the device's key. Confirm you
are connecting to your Pi before answering yes. A changed-key warning requires
checking which device/card is at that address before changing saved keys.

Enter your **Pi password**, not your RepeaterBook password. **No characters appear
while you type it**; press Enter when finished. A prompt containing your Pi
username/hostname means you are now entering commands on the Pi.

If Windows says ssh is not recognised, add **OpenSSH Client** in Windows Optional
Features using [Microsoft's instructions](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse),
then reopen Terminal. The client is the component needed on your computer.

## 3. Download and run Apollo in the SSH window

On your computer, open the
[Apollo download page](https://www.repeaterbooklive.com/apollo/downloads/#platform-raspberry-pi).
Expand **Raspberry Pi**, right-click **Download Installer** and choose **Copy link
address** (wording varies by browser). Use this complete installer ZIP.

In the block below, replace PASTE_INSTALLER_LINK_HERE with that copied link.
Keep the single quotation marks around it. Paste the entire block into the
**connected SSH window**, then press Enter. This downloads onto the Pi, creates a
new installer folder and extracts the whole ZIP before running the installer.

~~~sh
cd "$(mktemp -d "$HOME/apollo-install.XXXXXX")" &&
curl --fail --location 'PASTE_INSTALLER_LINK_HERE' --output apollo-installer.zip &&
python3 -m zipfile -e apollo-installer.zip . &&
cd Apollo-Pi-Installer &&
sudo python3 install.py --apply
~~~

Right-click Paste or use your terminal's Paste menu. Linux terminals commonly use
Ctrl+Shift+V. The linked commands stop at a failed step instead of continuing with
an incomplete download. If curl is missing on your OS, run the following inside
SSH, then retry the block above:

~~~sh
sudo apt-get update && sudo apt-get install -y curl
~~~

If sudo asks for a password, enter the same **Pi password** again. Nothing appears
as you type. Keep the SSH window open, and keep power and internet connected.
Downloads can take several minutes. Wait for **Apollo installation completed**.
**Stopped** means installation did not finish; retain the last step and stop code.

## 4. Open Apollo on your computer

In the SSH window, run:

~~~sh
hostname -I
~~~

The option is a capital I. It lists the Pi's network addresses. Open your Windows,
Mac or Linux browser and enter http:// followed by the Pi's local address, for
example **http://192.168.1.42/**. Use the address from your Pi, not this example.
If several addresses appear, use the local IPv4 address from your router's list.

**Do not use localhost on your computer.** Localhost would refer to your computer,
not the Pi. You should see Apollo / RepeaterBook Live with the build matching the
download card. **Welcome to nginx is not Apollo.**

For a new node, choose **Connect to RepeaterBook** in that browser and sign in with
your RepeaterBook account. Complete the receiver/location checklist when the
hardware is connected, submit it for administrator review and leave the Pi running.
Installation can finish before those tasks; installation does not approve reporting.
Existing owners keep their registration. The SSH window can be closed after the
installer finishes; Apollo runs in the background.

## Desktop alternative

If you have a screen and keyboard on the Pi, download the complete installer ZIP
in the Pi browser. Open File Manager > Downloads, right-click the ZIP and choose
Extract Here, or open the archive and choose Extract. Open the extracted folders
until install.py and payload appear together in Apollo-Pi-Installer. Keep the
whole folder together; do not run install.py inside the unopened ZIP.

Right-click an empty area in that folder and choose Open in Terminal / Open
Terminal Here. Some desktops use Tools > Open Current Folder in Terminal. Run:

~~~sh
sudo python3 install.py --apply
~~~

Use your Pi password if asked. Wait for Apollo installation completed. On the Pi's
own browser, open **http://localhost/**. For a browser on another computer, use the
Pi's network address as described in step 4. Newer bundles include READ-ME-FIRST.html.

## If something goes wrong

- **Connection refused / connection timed out:** check that SSH is enabled, the Pi
  has finished booting, the address is correct and both devices share a network.
- **Permission denied when connecting:** check your Pi username/password or SSH key.
  Your RepeaterBook account is used later, in the Apollo browser page.
- **Download failed:** check internet and that you pasted the complete Download
  Installer link inside the quotes. Retry the whole block after fixing the cause.
- **install.py cannot be found:** run it from the extracted Apollo-Pi-Installer
  folder containing install.py and payload, not from your computer's terminal.
- **ENOENT after installation starts:** retain the last step and stop code.
  The code alone cannot identify the missing file or command.
- **Welcome to nginx / Apollo does not open:** retry the same installer once. If
  it stops again or the welcome page remains, contact support with the build,
  last step, stop code and exact browser message. Do not delete nginx files or services.
- **Support report file URL appears:** a file:///var/tmp/... address is on the Pi.
  It will not open on your other computer. Over SSH, copy the support details
  shown in the terminal instead. On a Pi desktop, open the report there and use
  Copy support details. Never copy a private command.json into a public message.
- **Waiting for approval:** finish and submit the dashboard checklist when your
  receiver is connected, leave the Pi running and follow the displayed status.

For help, include the installer build, Pi/receiver models (or receiver not yet
connected), last step, stop code and exact browser message. Use the
[Apollo community](https://repeaterbook.groups.io/g/apollo) or your existing support
conversation. Keep private command.json files; provide only a redacted copy
privately if support requests it. Never post passwords, tokens or credential files.

## SDRplay receivers

The current automatic profile is **RSP1B**, with the SDRplay API service required
separately. SDRconnect alone does not establish compatibility. RSP2 reception is
not qualified. Contact support before using an RSP2. This receiver qualification
is separate from installing Apollo without a connected receiver.
