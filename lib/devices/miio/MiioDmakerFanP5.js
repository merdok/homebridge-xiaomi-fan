const MiioFan = require('./MiioFan.js');
const FanCapabilities = require('../../FanCapabilities.js');

class MiioDmakerFanP5 extends MiioFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }


  /*----------========== INIT ==========----------*/

  initFanCapabilities() {
    this.addCapability(FanCapabilities.POWER_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_SPEED_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_LEVEL_CONTROL, true);
    this.addCapability(FanCapabilities.NUMBER_OF_FAN_LEVELS, 4);
    this.addCapability(FanCapabilities.OSCILLATION_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_ANGLE_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_ANGLE_RANGE, [0, 120]);
    this.addCapability(FanCapabilities.LEFT_RIGHT_MOVE, true);
    this.addCapability(FanCapabilities.NATURAL_MODE, true);
    this.addCapability(FanCapabilities.CHILD_LOCK, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER_UNIT, 'minutes');
    this.addCapability(FanCapabilities.BUZZER_CONTROL, true);
    this.addCapability(FanCapabilities.LED_CONTROL, true);
  }


  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define the fan properties
    this.miioFanDevice.defineProperty('power');
    this.miioFanDevice.defineProperty('mode');
    this.miioFanDevice.defineProperty('speed');
    this.miioFanDevice.defineProperty('roll_enable');
    this.miioFanDevice.defineProperty('roll_angle');
    this.miioFanDevice.defineProperty('time_off');
    this.miioFanDevice.defineProperty('light');
    this.miioFanDevice.defineProperty('beep_sound');
    this.miioFanDevice.defineProperty('child_lock');
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === true;
  }

  getRotationSpeed() {
    return this.getFanProperties().speed;
  }

  isChildLockActive() {
    return this.getFanProperties().child_lock === true;
  }

  isSwingModeEnabled() {
    return this.getFanProperties().roll_enable === true;
  }

  getAngle() {
    return this.getFanProperties().roll_angle;
  }

  isNaturalModeEnabled() {
    return this.getFanProperties().mode === 'nature'; // normal is standard
  }

  isBuzzerEnabled() {
    return this.getFanProperties().beep_sound === true;
  }

  isLedEnabled() {
    return this.getFanProperties().light === true;
  }

  getShutdownTimer() {
    return this.getFanProperties().time_off;
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.sendCommand('s_power', power, ['power']);
  }

  async setRotationSpeed(speed) {
    return this.sendCommand('s_speed', speed, ['speed']);
  }

  async setChildLock(active) {
    return this.sendCommand('s_lock', active, ['child_lock']);
  }

  async setSwingModeEnabled(enabled) {
    return this.sendCommand('s_roll', enabled, ['roll_enable']);
  }

  async setAngle(angle) {
    if (angle > 120) angle = 120;
    if (angle < 0) angle = 0;
    return this.sendCommand('s_angle', angle, ['roll_angle']);
  }

  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 'nature' : 'normal';
    return this.sendCommand('s_mode', mode, ['mode']);
  }

  async moveLeft() {
    return this.sendCommand('m_roll', 'left');
  }

  async moveRight() {
    return this.sendCommand('m_roll', 'right');
  }

  async setBuzzerEnabled(enabled) {
    return this.sendCommand('s_sound', enabled, ['beep_sound']);
  }

  async setLedEnabled(enabled) {
    return this.sendCommand('s_light', enabled, ['light']);
  }

  async setShutdownTimer(minutes) {
    return this.sendCommand('s_t_off', minutes, ['time_off']);
  }


}

module.exports = MiioDmakerFanP5;
