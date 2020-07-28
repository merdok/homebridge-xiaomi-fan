const MiotFan = require('./miotFan.js');

class MiotDmakerAcFan extends MiotFan {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, deviceId, name, pollingInterval, log);
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
    return this.properties.power === true;
  }

  getRotationSpeed() {
    return this.properties.fan_level * 33 || 0; // the fan has 3 levels for fan speed (no manual % set) that is why multiply the fan speed by 33
  }

  isChildLockActive() {
    return this.properties.child_lock === true;
  }

  isSwingModeEnabled() {
    return this.properties.swing_mode === true;
  }

  isNaturalModeEnabled() {
    return this.properties.mode === 1;
  }

  isBuzzerEnabled() {
    return this.properties.buzzer === true;
  }

  isLedEnabled() {
    return this.properties.light === true;
  }

  getShutdownTimer() {
    return this.properties.power_off_time;
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.setProperty('power', power);
  }

  async setRotationSpeed(speed) {
    let speedLevel = 1
    if (speed < 33) {
      speedLevel = 1
    } else if (speed >= 33 && speed < 66) {
      speedLevel = 2
    } else if (speed >= 66) {
      speedLevel = 3
    }
    return this.setProperty('fan_level', speedLevel);
  }

  async setChildLock(active) {
    return this.setProperty('child_lock', active);
  }

  async setSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode', enabled);
  }

  async setNaturalModeEnabled(enabled) {
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
