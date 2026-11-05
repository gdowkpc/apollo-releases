# Install Apollo on a Raspberry Pi

Use your Windows computer. The Pi needs power and internet, but no keyboard,
monitor or receiver. Both devices must be on the same home network.

**Start with the [plain installation page](https://www.repeaterbooklive.com/apollo/downloads/pi-install.php).**
It provides the current public build and copy-ready commands with a checksum.
No GitHub account or download-link editing is needed.

## Already using Apollo? Check the build first

Keep your SD card, registration and settings. Do not reimage, uninstall Apollo
or delete nginx files just to retry installation. Open the Pi in your browser
and compare its installed Software build with the public installation page:

- **Installed build is higher:** stop. Keep your newer release. Do not run the
  older installer or bypass a newer-version stop; ask support if repair is needed.
- **Same build:** reinstall only to retry or repair an unfinished installation.
  A healthy installation does not need reinstalling.
- **Lower build, or no Apollo installed:** continue below.
- **Existing build unknown / page unavailable:** do not guess. Ask support before repair.

## Before you start

The installer needs **64-bit Raspberry Pi OS based on Debian 13 (Trixie)** with
Python 3. It does not upgrade your OS. Missing system packages are installed for
you. Node.js, npm and nvm are not manual prerequisites; existing nvm can remain.

Have your Pi username, Pi password and hostname/IP address ready. These are
separate from your RepeaterBook account; there is no shared Apollo password.

## 1. Enable remote access

Already signed in over SSH? Go to step 3.

For a new card, use [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
to select your Pi and the supported 64-bit OS. Writing replaces that card's
contents. Keep an existing installation's card; use a separate card for a
new setup. In Imager's customisation settings, record the hostname, create your
username/password, configure Wi-Fi if needed, and enable SSH under Remote Access.
Use your Pi password for password authentication, or retain existing SSH keys.
Insert the card, connect Ethernet if using it, and power on. Allow several minutes
for first boot. See the [official setup instructions](https://www.raspberrypi.com/documentation/computers/getting-started.html).

For an existing Pi with SSH disabled, use its existing remote access or the
[official SSH instructions](https://www.raspberrypi.com/documentation/computers/remote-access.html#ssh).
Do not overwrite the card just to enable SSH.

## 2. Sign in from Windows

Right-click Windows **Start**, then choose **Terminal** or **Windows PowerShell**.
An administrator window is not required. Type the following after replacing
both uppercase placeholders with your own values:

~~~text
ssh YOUR_PI_USER@YOUR_PI_ADDRESS
~~~

For example, username alex and hostname apollo-w4jew-1 would use:

~~~text
ssh alex@apollo-w4jew-1.local
~~~

If the hostname fails, use your router's connected-devices list to find the IP:

~~~text
ssh alex@192.168.1.42
~~~

Use your own username and address. Guest Wi-Fi/network isolation can block local
access even when both devices have internet. Ethernet can simplify first setup.

On the first connection, confirm the address belongs to your Pi before answering
yes to the trust prompt. **If the host key has changed, stop and verify the
device/card before changing saved keys.** Enter your **Pi password** when asked.
No characters or dots appear as you type; press Enter afterwards.

A prompt such as **alex@apollo-w4jew-1:~ $** means commands now run on the Pi.
A prompt starting **PS C:** is still on Windows: connect with SSH first.
If Windows cannot find ssh, install **OpenSSH Client** in Windows Optional
Features using [Microsoft's instructions](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse),
then reopen Terminal. Mac/Linux users can use their Terminal app.

## 3. Check the Pi before installing

In the connected SSH window, paste this read-only command and press Enter:

~~~sh
uname -m; cat /etc/os-release; cat /proc/device-tree/model; echo
~~~

Look for **aarch64** (64-bit), **VERSION_ID="13"** and **trixie**. The last line
shows your Pi model. **armv7l means 32-bit: stop.** If the OS differs or you are
unsure, stop and share these results with support. Do not upgrade the OS as part
of this installer. Check an existing Apollo build as described above.

## 4. Download and install onto the Pi

Open the [plain installation page](https://www.repeaterbooklive.com/apollo/downloads/pi-install.php)
on Windows and use **Copy install commands**. The current installer URL and
checksum are included: there is no link placeholder to edit. Paste the commands
into the **connected SSH window** and press Enter.

In Windows Terminal use **Ctrl+Shift+V** or its Paste menu. Windows PowerShell
can use right-click Paste. If a multiline-paste warning appears, review what you
copied and confirm only if it matches. Do not paste into a Windows prompt before
SSH connects. The commands download onto the Pi, verify the complete ZIP, extract
it and run the installer. You do not need to extract a ZIP on Windows.

**Download ZIP** is for the Pi desktop alternative or manual transfer, not the
normal Windows-to-Pi path. If sudo asks, enter your Pi password again (typing is
hidden). Keep the SSH window, power and internet on. Wait for **Apollo
installation completed**. A service running is not sufficient. **Stopped** means
do not continue: retain the last step and code. A newer-version stop means keep
your installed release, not retry the older installer.

If curl is missing, run this inside SSH, then copy the install commands again:

~~~sh
sudo apt-get update && sudo apt-get install -y curl
~~~

If Python 3 is missing or the checksum fails, stop and contact support. Do not
skip verification, rename partial downloads or start overlapping installers.

## 5. Open Apollo in your Windows browser

Use the **same Pi address that worked for SSH**, starting with **http://**.
SSH to alex@192.168.1.42 corresponds to **http://192.168.1.42/**. Omit the username
and @. Type into the address bar, not search. Use your own address.
**Do not use localhost on Windows**; that refers to Windows, not the Pi.

If you need the address, run inside SSH:

~~~sh
hostname -I
~~~

The I is capital. A dotted address such as **192.168.1.42** is IPv4. An address
with colons is IPv6. If several appear, use the Pi's local IPv4 from your router;
do not paste all addresses into the browser. Guide addresses are examples.

You should see Apollo / RepeaterBook Live and the installed build.
**Welcome to nginx is not Apollo.** After success you can close SSH; Apollo runs
in the background. New nodes connect their RepeaterBook account in the browser
and complete receiver/location setup and administrator approval afterwards.
Installation can finish without a receiver; it does not enable reporting.
Existing owners keep registration. For an installation-only test, stop when
Apollo opens; do not enroll, change receivers or enable reporting.

## Desktop alternative

On a Pi with its own keyboard/screen, choose Download ZIP on the installation
page. Extract the whole ZIP, open Apollo-Pi-Installer containing install.py and
payload together, and open Terminal from that folder. Do not run from inside the ZIP.

~~~sh
sudo python3 install.py --apply
~~~

Wait for Apollo installation completed, then open **http://localhost/** on the
Pi itself. Other computers use the Pi's network address.

## If something goes wrong

- **Connection refused / timeout:** check power, first boot, SSH, address and local network isolation.
- **Permission denied:** use Pi credentials, not your RepeaterBook login.
- **pi_installer_not_newer:** keep your newer version; ask support if repair is needed. Do not retry the older installer.
- **Download/checksum failure:** stop and use the current command after fixing the connection. Never continue with a partial ZIP.
- **install.py not found:** keep the entire extracted folder together on the Pi.
- **ENOENT:** retain the step and code; the code alone does not identify what is missing.
- **Welcome to nginx:** retry once only if the installer matches or advances the installed build; otherwise ask support. Do not delete nginx files.
- **SSH disconnected:** reconnect, inspect the dashboard, and ask support if state is unclear. Do not start overlapping installers.
- **Support file URL:** a file:///var/tmp/... path is on the Pi, not Windows. Copy the SSH support details instead.

For help, give installer build, Pi model, OS results, receiver model (or none),
last step, code and browser message. Never post passwords, tokens or private
command.json files. Use the [Apollo community](https://repeaterbook.groups.io/g/apollo)
or your existing support conversation. Keep your card, registration and settings.

## SDRplay receivers

The automatic profile is RSP1B and needs the SDRplay API service separately.
SDRconnect alone does not establish compatibility. RSP2 reception is unqualified.
These receiver limits do not prevent installing without a connected receiver.
