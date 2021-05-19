const MiotFan = require('./MiotFan.js');
const FanCapabilities = require('../../FanCapabilities.js');

class ZhimiFanFa1 extends MiotFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }

  // zhimi.fan.fa1
  // http://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:zhimi-fa1:2


  /*----------========== INIT ==========----------*/

  initFanCapabilities() {
    this.addCapability(FanCapabilities.POWER_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_SPEED_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_LEVEL_CONTROL, true);
    this.addCapability(FanCapabilities.NUMBER_OF_FAN_LEVELS, 5);
    this.addCapability(FanCapabilities.OSCILLATION_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_ANGLE_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_ANGLE_RANGE, [0, 120]);
    this.addCapability(FanCapabilities.OSCILLATION_VERTICAL_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_VERTICAL_ANGLE_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_VERTICAL_ANGLE_RANGE, [0, 90]);
    this.addCapability(FanCapabilities.LEFT_RIGHT_MOVE, true);
    this.addCapability(FanCapabilities.UP_DOWN_MOVE, true);
    this.addCapability(FanCapabilities.NATURAL_MODE, true);
    this.addCapability(FanCapabilities.CHILD_LOCK, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER_UNIT, 'hours');
    this.addCapability(FanCapabilities.BUZZER_CONTROL, true);
    this.addCapability(FanCapabilities.LED_CONTROL, true);
  }


  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define general fan properties
    this.defineProperty('power', 2, 1);
    this.defineProperty('fan_level', 2, 2);
    this.defineProperty('child_lock', 6, 1);
    this.defineProperty('fan_speed', 5, 10);
    this.defineProperty('swing_mode', 2, 3);
    this.defineProperty('swing_mode_angle', 2, 5);
    this.defineProperty('swing_mode_vertical', 2, 4);
    this.defineProperty('swing_mode_vertical_angle', 2, 6);
    this.defineProperty('power_off_time', 5, 2);
    this.defineProperty('buzzer', 2, 11);
    this.defineProperty('light', 2, 10);
    this.defineProperty('mode', 2, 7);
    this.defineCommand('set_move', 5, 6);
    this.defineCommand('set_move_vertical', 5, 7);
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === true;
  }

  getRotationSpeed() {
    return this.getSafePropertyValue(this.getFanProperties().fan_speed, 0);
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

  isVerticalSwingModeEnabled() {
    return this.getFanProperties().swing_mode_vertical === true;
  }

  getVerticalAngle() {
    return this.getFanProperties().swing_mode_vertical_angle;
  }

  isNaturalModeEnabled() {
    return this.getFanProperties().mode === 0;
  }

  isBuzzerEnabled() {
    return this.getFanProperties().buzzer === true;
  }

  isLedEnabled() {
    return this.getFanProperties().light === true;
  }

  getShutdownTimer() {
    return this.getFanProperties().power_off_time * 60; //convert hours to minutes, fan reports hours
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
    if (angle > 120) angle = 120; // the fans only support some predifened angles so i am not sure how this will beahve
    if (angle < 0) angle = 0;
    return this.setProperty('swing_mode_angle', angle);
  }

  async setVerticalSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode_vertical', enabled);
  }

  async setVerticalAngle(angle) {
    if (angle > 90) angle = 90;
    if (angle < 0) angle = 0;
    return this.setProperty('swing_mode_vertical_angle', angle);
  }

  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 0 : 1;
    return this.setProperty('mode', mode);
  }

  async moveLeft() {
    return this.sendCommnd('set_move', "left");
  }

  async moveRight() {
    return this.sendCommnd('set_move', "right");
  }

  async moveUp() {
    return this.sendCommnd('set_move_vertical', "up");
  }

  async moveDown() {
    return this.sendCommnd('set_move_vertical', "down");
  }

  async setBuzzerEnabled(enabled) {
    return this.setProperty('buzzer', enabled);
  }

  async setLedEnabled(enabled) {
    return this.setProperty('light', enabled);
  }

  async setShutdownTimer(minutes) {
    let hours = minutes / 60;
    return this.setProperty('power_off_time', hours);
  }


}

module.exports = ZhimiFanFa1;
