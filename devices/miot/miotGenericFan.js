const BaseFan = require('../baseFan.js');

class MiotGenericFan extends BaseFan {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, deviceId, name, pollingInterval, log);
  }

  // based on zhimi.fan.za5
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:zhimi-za5:2

  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define general fan properties
    this.defineProperty('power', 2, 1);
    this.defineProperty('fan_level', 2, 2);
    this.defineProperty('child_lock', 3, 1);
    this.defineProperty('swing_mode', 2, 3);
    this.defineProperty('swing_mode_angle', 2, 5);
    this.defineProperty('mode', 2, 7);
    this.defineProperty('power_off_time', 2, 10);
    this.defineProperty('light', 4, 3);
    this.defineProperty('buzzer', 5, 1);
  }


  /*----------========== CAPABILITIES ==========----------*/

  supportsPowerControl() {
    return true;
  }

  supportsFanLevel() {
    return true;
  }

  numberOfFanLevels() {
    return 4;
  }

  supportsOscillation() {
    return true;
  }

  supportsNaturalMode() {
    return true;
  }

  supportsChildLock() {
    return true;
  }

  supportsPowerOffTimer() {
    return true;
  }

  powerOffTimerUnit() {
    return 'seconds';
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
    return this.properties.fan_speed;
  }

  isChildLockActive() {
    return this.properties.child_lock === true;
  }

  isSwingModeEnabled() {
    return this.properties.swing_mode === true;
  }

  getAngle() {
    return this.properties.swing_mode_angle;
  }

  isNaturalModeEnabled() {
    return this.properties.mode === 0;
  }

  isBuzzerEnabled() {
    return this.properties.buzzer === true;
  }

  isLedEnabled() {
    return this.properties.light === true;
  }

  getShutdownTimer() {
    return Math.ceil(this.properties.power_off_time / 60); // return in minutes, rounded up
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.setProperty('power', power);
  }

  async setRotationSpeed(speed) {
    return this.setProperty('fan_speed', speed);
  }

  async setChildLock(active) {
    return this.setProperty('child_lock', active);
  }

  async setSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode', enabled);
  }

  async setAngle(angle) {
    if (angle > 120) angle = 120; // the fans only support some predifened angles so i am not sure how this will beahve
    if (angle < 0) angle = 0;
    return this.setProperty('swing_mode_angle', angle);
  }


  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 0 : 1;
    return this.setProperty('mode', mode);
  }

  async setBuzzerEnabled(enabled) {
    return this.setProperty('buzzer', enabled);
  }

  async setLedEnabled(enabled) {
    return this.setProperty('light', enabled);
  }

  async setShutdownTimer(minutes) {
    let seconds = minutes * 60;
    return this.setProperty('power_off_time', seconds);
  }


}

module.exports = MiotGenericFan;
