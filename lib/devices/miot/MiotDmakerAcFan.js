const MiotFan = require('./MiotFan.js');

class MiotDmakerAcFan extends MiotFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }

  // dmaker.fan.1c
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:dmaker-1c:1

  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define the fan properties
    this.defineProperty('power', 2, 1);
    this.defineProperty('fan_level', 2, 2);
    this.defineProperty('child_lock', 3, 1);
    this.defineProperty('swing_mode', 2, 3);
    this.defineProperty('power_off_time', 2, 10);
    this.defineProperty('buzzer', 2, 11);
    this.defineProperty('light', 2, 12);
    this.defineProperty('mode', 2, 7);
  }


  /*----------========== CAPABILITIES ==========----------*/

  supportsPowerControl() {
    return true;
  }

  supportsFanLevel() {
    return true;
  }

  numberOfFanLevels() {
    return 3;
  }

  supportsOscillation() {
    return true;
  }

  supportsSleepMode() {
    return true;
  }

  supportsChildLock() {
    return true;
  }

  supportsPowerOffTimer() {
    return true;
  }

  powerOffTimerUnit() {
    return 'minutes';
  }

  supportsBuzzerControl() {
    return true;
  }

  supportsLedControl() {
    return true;
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === true;
  }

  getFanLevel() {
    return this.getFanProperties().fan_level;
  }

  isChildLockActive() {
    return this.getFanProperties().child_lock === true;
  }

  isSwingModeEnabled() {
    return this.getFanProperties().swing_mode === true;
  }

  isSleepModeEnabled() {
    return this.getFanProperties().mode === 1;
  }

  isBuzzerEnabled() {
    return this.getFanProperties().buzzer === true;
  }

  isLedEnabled() {
    return this.getFanProperties().light === true;
  }

  getShutdownTimer() {
    return this.getFanProperties().power_off_time;
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.setProperty('power', power);
  }

  async setFanLevel(level) {
    return this.setProperty('fan_level', level);
  }

  async setChildLock(active) {
    return this.setProperty('child_lock', active);
  }

  async setSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode', enabled);
  }

  async setSleepModeEnabled(enabled) {
    let mode = enabled ? 1 : 0;
    return this.setProperty('mode', mode);
  }

  async setBuzzerEnabled(enabled) {
    return this.setProperty('buzzer', enabled);
  }

  async setLedEnabled(enabled) {
    return this.setProperty('light', enabled);
  }

  async setShutdownTimer(minutes) {
    return this.setProperty('power_off_time', minutes);
  }


}

module.exports = MiotDmakerAcFan;
