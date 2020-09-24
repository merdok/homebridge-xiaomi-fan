const MiotFan = require('./miotFan.js');

class MiotSmartmiDcFan extends MiotFan {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, deviceId, name, pollingInterval, log);
  }

  // zhimi.fan.za5
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:zhimi-za5:2

  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define general fan properties
    this.defineProperty('power', 2, 1);
    this.defineProperty('fan_level', 2, 2);
    this.defineProperty('child_lock', 3, 1);
    this.defineProperty('fan_speed', 6, 8);
    this.defineProperty('swing_mode', 2, 3);
    this.defineProperty('swing_mode_angle', 2, 5);
    this.defineProperty('power_off_time', 2, 10);
    this.defineProperty('buzzer', 5, 1);
    this.defineProperty('light', 4, 3);
    this.defineProperty('mode', 2, 7);
    this.defineProperty('anion', 2, 11);

    // read only
    this.defineProperty('relative_humidity', 7, 1);
    this.defineProperty('temperature', 7, 7);
    this.defineProperty('battery', 6, 2);
    this.defineProperty('fan_speed_rpm', 6, 4);
    this.defineProperty('ac_power', 6, 5);

    this.defineCommand('set_move', 6, 3);
  }


  /*----------========== CAPABILITIES ==========----------*/

  supportsPowerControl() {
    return true;
  }

  supportFanSpeed() {
    return true;
  }

  supportFanSpeedRpm() {
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

  supportsOscillationAngle() {
    return true;
  }

  oscillationAngleRange() {
    return [30, 120];
  }

  supportsLeftRightMove() {
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

  supportsLedLevels() {
    return true;
  }

  supportsIoniser() {
    return true;
  }

  supportsTemperature() {
    return true;
  }

  supportsRelativeHumidity() {
    return true;
  }

  hasBuiltInBattery() {
    return true;
  }

  supportsBatteryStateReporting() {
    return true;
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.properties.power === true;
  }

  getRotationSpeed() {
    return this.properties.fan_speed;
  }

  getSpeed() {
    return this.properties.fan_speed_rpm;
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

  getLedLevel() {
    return this.properties.light;
  }

  isLedEnabled() {
    return this.getLedLevel() > 0;
  }

  getShutdownTimer() {
    return Math.ceil(this.properties.power_off_time / 60); // return in minutes, rounded up
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }

  isIoniserEnabled() {
    return this.properties.anion === true;
  }

  getTemperature(){
    return this.properties.temperature;
  }

  getRelativeHumidity(){
    return this.properties.relative_humidity;
  }

  getBatteryLevel(){
    return this.properties.battery;
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
    if (angle > 120) angle = 120;
    if (angle < 30) angle = 30;
    return this.setProperty('swing_mode_angle', angle);
  }

  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 0 : 1;
    return this.setProperty('mode', mode);
  }

  async moveLeft() {
    return this.sendCommnd('set_move', 'left');
  }

  async moveRight() {
    return this.sendCommnd('set_move', 'right');
  }

  async setBuzzerEnabled(enabled) {
    return this.setProperty('buzzer', enabled);
  }

  async setLedEnabled(enabled) {
    return this.setProperty('light', enabled);
  }

  async setLedLevel(level) {
    if (level > 100) level = 100;
    if (level < 0) level = 0;
    return this.setProperty('light', level);
  }

  async setShutdownTimer(minutes) {
    let seconds = minutes * 60;
    return this.setProperty('power_off_time', seconds);
  }

  async setIoniserEnabled(enabled) {
    return this.setProperty('anion', enabled);
  }


}

module.exports = MiotSmartmiDcFan;
