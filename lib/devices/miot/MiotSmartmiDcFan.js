const MiotFan = require('./MiotFan.js');
const FanCapabilities = require('../../FanCapabilities.js');

class MiotSmartmiDcFan extends MiotFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }

  // zhimi.fan.za5
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:zhimi-za5:2


  /*----------========== INIT ==========----------*/

  initFanCapabilities() {
    this.addCapability(FanCapabilities.POWER_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_SPEED_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_SPEED_RPM_REPORTING, true);
    this.addCapability(FanCapabilities.FAN_LEVEL_CONTROL, true);
    this.addCapability(FanCapabilities.NUMBER_OF_FAN_LEVELS, 4);
    this.addCapability(FanCapabilities.OSCILLATION_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_ANGLE_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_ANGLE_RANGE, [30, 120]);
    this.addCapability(FanCapabilities.LEFT_RIGHT_MOVE, true);
    this.addCapability(FanCapabilities.NATURAL_MODE, true);
    this.addCapability(FanCapabilities.CHILD_LOCK, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER_UNIT, 'seconds');
    this.addCapability(FanCapabilities.BUZZER_CONTROL, true);
    this.addCapability(FanCapabilities.LED_CONTROL, true);
    this.addCapability(FanCapabilities.LED_CONTROL_BRIGHTNESS, true);
    this.addCapability(FanCapabilities.IONISER_CONTROL, true);
    this.addCapability(FanCapabilities.TEMPERATURE_REPORTING, true);
    this.addCapability(FanCapabilities.HUMIDITY_REPORTING, true);
    this.addCapability(FanCapabilities.BUILT_IN_BATTERY, true);
  }


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
    this.defineProperty('battery_power', 6, 2);
    this.defineProperty('fan_speed_rpm', 6, 4);
    this.defineProperty('ac_power', 6, 5);
    //this.defineProperty('country_code', 6, 9); // max 16 props for miot device, country is not used, disable!

    this.defineCommand('set_move', 6, 3);
    this.defineCommand('set_lp_enter_second', 6, 7);
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === true;
  }

  getRotationSpeed() {
    return this.getSafePropertyValue(this.getFanProperties().fan_speed, 0);
  }

  getSpeed() {
    return this.getSafePropertyValue(this.getFanProperties().fan_speed_rpm, 0);
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

  getAngle() {
    return this.getFanProperties().swing_mode_angle;
  }

  isNaturalModeEnabled() {
    return this.getFanProperties().mode === 0;
  }

  isBuzzerEnabled() {
    return this.getFanProperties().buzzer === true;
  }

  isLedEnabled() {
    return this.getLedLevel() > 0;
  }

  getLedBrightness() {
    return this.getFanProperties().light;
  }

  getShutdownTimer() {
    return Math.ceil(this.getFanProperties().power_off_time / 60); // return in minutes, rounded up
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }

  isIoniserEnabled() {
    return this.getFanProperties().anion === true;
  }

  getTemperature() {
    return this.getFanProperties().temperature;
  }

  getRelativeHumidity() {
    return this.getFanProperties().relative_humidity;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.setProperty('power', power);
  }

  async setRotationSpeed(speed) {
    return this.setProperty('fan_speed', speed);
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

  async setAngle(angle) {
    angle = this.adjustOscillationAngleToRange(angle);
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
    let brightness = enabled ? 100 : 0;
    return this.setProperty('light', brightness);
  }

  async setLedBrightness(brightness) {
    if (brightness > 100) brightness = 100;
    if (brightness < 0) brightness = 0;
    return this.setProperty('light', brightness);
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
