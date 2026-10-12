# Fix for saving an RTL-SDR scan plan after node recovery

Apollo 2.3.66 Build 279 fixes the receiver-change error when the same RTL-SDR is connected and you save the Recommended 2-meter and 70-centimeter scan patterns after recovering an existing node. It preserves your existing node identity and settings.

1. Keep your RTL-SDR connected.
2. Open Apollo's Settings and select **Check for updates**.
3. Look for **2.3.66 / Build 279**. If Apollo offers installation, follow its confirmation screen.
4. If installation reports an error, keep the existing installation and send RepeaterBook support the error message. Do not reset the Pi, delete its settings, or register/recover the node again to work around an update error.

The [Apollo downloads page](https://www.repeaterbooklive.com/apollo/downloads/) lists this release under **Raspberry Pi / Linux ARM64**, with the button **Download beta · Build 279**. The application ZIP requires the signed Universal Pi Updater; downloading or extracting it does not install the update. Older installations can need assistance to update that installer first.

Once the update is installed, confirm **2.3.66 / Build 279** in Apollo, then select your scan patterns and click **Save**.

## Installation notes for support

The exact application ZIP was qualified with production signed Universal Pi Updater **1.0.72**. Build 267's dashboard transport requests updater authority from the private source repository, returning HTTP 404 without maintainer access. Updater 1.0.70 also rejects the newer protected-controller inventory. Discovery and successful installation are separate checks; do not promise an unattended upgrade from Build 267.

For an already managed node with signed updater 1.0.72 provisioned and its independently verified authority file available, run canonical preflight:

```sh
sudo node /opt/apollo-universal-pi-updater/current/scripts/apollo_universal_pi_update.js \
  --updater-authority /path/to/verified-1.0.72-authority.json \
  --tag apollo-passive-v2.3.66-build.279 --preflight
```

Check the result identifies 2.3.66 Build 279, source `d54a969df8e206cd08cced794d987d193040be0b`, and artifact hash `fbb728569018e8974de43a571fc1186e5e1a9c52f66e9642f629fd6132144635`. Apply the reviewed result using the same command with `--apply` in place of `--preflight`. This preserves canonical configuration, credentials and reporting state through the authenticated updater. Do not manually replace the application's current symlink or activate the ZIP outside that updater.

This release does not change the reporting authorization or establish reception at the customer's location. SDRplay/RSP1B remains experimental and BCT15X qualification remains deferred.
