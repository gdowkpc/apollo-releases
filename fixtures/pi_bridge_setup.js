"use strict";
// In-memory synthetic data for validator tests only; never qualification output.
const {hash}=require("../scripts/validate_pi_bridge_compatibility"),h=v=>hash(String(v));
function initialSetup(release,baselineVersion,progress){return {
  baseline_updater_version:baselineVersion,initial_state:"setup_required",final_state:"receiver_ready",application_sha256:release.application_sha256,updater_version:release.updater_version,
  before_configuration_sha256:h("unbound config"),saved_configuration_sha256:h("bound config"),registration_before_sha256:h("registration"),registration_after_save_sha256:h("registration"),
  neutral_choices_before_sha256:h("choices"),neutral_choices_after_save_sha256:h("choices"),location_before_sha256:h("location"),location_after_save_sha256:h("location"),
  receiver_selection:"exactly_one_serial_identified_rtl",receiver_identity_sha256:h("serial identity"),save_transaction_sha256:h("save"),native_observations_sha256:h("real native observations"),
  packaged_safeguards:{scope:"exact_packaged_application_tests",application_sha256:release.application_sha256,source_commit:release.source_commit,
    receiver_config_sha256:h("receiver config code"),watcher_sha256:h("watcher code"),log_sha256:h("packaged tests"),
    checks:Object.fromEntries(["missing_receiver","ambiguous_receiver","receiver_swap","calibration","manual_gain","unknown_bound_fields"].map(k=>[k,true]))},
  native_no_device_refusal:{scope:"direct_verified_package_component",updater_version:baselineVersion,application_sha256:release.application_sha256,code:"generic_target_receiver_selection_required",log_sha256:h("native guard")},
  post_save_progress:progress(600),log_sha256:h("initial setup logs")};}
function unboundUpgrade(release){return {initial_state:"setup_required",final_state:"setup_required",application_sha256:release.application_sha256,updater_version:release.updater_version,
  transaction_sha256:h("unbound upgrade"),before_state_sha256:h("unbound state"),upgraded_state_sha256:h("unbound state"),before_configuration_sha256:h("unbound config"),upgraded_configuration_sha256:h("unbound config"),log_sha256:h("unbound upgrade logs")};}
module.exports={initialSetup,unboundUpgrade};
