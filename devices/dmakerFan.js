const BaseFan = require('./baseFan.js');

class DmakerFan extends BaseFan {
  constructor(miioDevice, ip, token, name, pollingInterval, log) {
    super(miioDevice, ip, token, name, pollingInterval, log);
  }


  /*----------========== SETUP ==========----------*/

  addPropertiesToFan(){
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

    // get the properties
    this.miioFanDevice._loadProperties();
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.miioFanDevice.miioProperties().power === true;
  }

  getRotationSpeed() {
    return this.miioFanDevice.miioProperties().speed;
  }

  isChildLockActive() {
    return this.miioFanDevice.miioProperties().child_lock === true;
  }

  isSwingModeEnabled() {
    return this.miioFanDevice.miioProperties().roll_enable === true;
  }

  getAngle() {
    return this.miioFanDevice.miioProperties().roll_angle;
  }

  isNaturalModeEnabled() {
    return this.miioFanDevice.miioProperties().mode === 'nature'; // normal is standard
  }

  isBuzzerEnabled() {
    return this.miioFanDevice.miioProperties().beep_sound === true;
  }

  isLedEnabled() {
    return this.miioFanDevice.miioProperties().light === true;
  }

  getShutdownTimer() {
    return this.miioFanDevice.miioProperties().time_off; // returns already in minutes
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }

  getUseTime() {
    return 0; // not supported by this fan
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

module.exports = DmakerFan;
