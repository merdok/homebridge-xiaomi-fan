const BaseFan = require('../baseFan.js');

class MiotDmakerDcFan extends BaseFan {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, deviceId, name, pollingInterval, log);
  }


  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define general fan properties
    this.defineProperty('power', `{"did":"${this.deviceId}", "siid": 2, "piid": 1}`);
    this.defineProperty('fan_level', `{"did":"${this.deviceId}", "siid": 2, "piid": 2}`);
    this.defineProperty('child_lock', `{"did":"${this.deviceId}", "siid": 3, "piid": 1}`);

    // the dmaker p9 and 10 fans are basically the same, they property mapping is just different
    let fanModel = this.miioFanDevice.miioModel;

    if(fanModel === 'dmaker.fan.p9'){
      // dmaker.fan.p9
      this.defineProperty('fan_speed', `{"did":"${this.deviceId}", "siid": 2, "piid": 11}`);
      this.defineProperty('swing_mode', `{"did":"${this.deviceId}", "siid": 2, "piid": 5}`);
      this.defineProperty('swing_mode_angle', `{"did":"${this.deviceId}", "siid": 2, "piid": 6}`);
      this.defineProperty('power_off_time', `{"did":"${this.deviceId}", "siid": 2, "piid": 8}`);
      this.defineProperty('buzzer', `{"did":"${this.deviceId}", "siid": 2, "piid": 7}`);
      this.defineProperty('light', `{"did":"${this.deviceId}", "siid": 2, "piid": 9}`);
      this.defineProperty('mode', `{"did":"${this.deviceId}", "siid": 2, "piid": 4}`);

      this.defineCommand('set_move', `{"did":"${this.deviceId}", "siid": 2, "piid": 10}`);
    }else{
      // dmaker.fan.p10
      this.defineProperty('fan_speed', `{"did":"${this.deviceId}", "siid": 2, "piid": 10}`);
      this.defineProperty('swing_mode', `{"did":"${this.deviceId}", "siid": 2, "piid": 4}`);
      this.defineProperty('swing_mode_angle', `{"did":"${this.deviceId}", "siid": 2, "piid": 5}`);
      this.defineProperty('power_off_time', `{"did":"${this.deviceId}", "siid": 2, "piid": 6}`);
      this.defineProperty('buzzer', `{"did":"${this.deviceId}", "siid": 2, "piid": 8}`);
      this.defineProperty('light', `{"did":"${this.deviceId}", "siid": 2, "piid": 7}`);
      this.defineProperty('mode', `{"did":"${this.deviceId}", "siid": 2, "piid": 3}`);

      this.defineCommand('set_move', `{"did":"${this.deviceId}", "siid": 2, "piid": 9}`);
    }
  }


  /*----------========== CAPABILITIES ==========----------*/

  // dmaker.fan.p9. dmaker.fan.p10
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:dmaker-p9:1
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:dmaker-p10:1

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
    return this.setProperty('fan_speed', speed);
  }

  async setChildLock(active) {
    return this.setProperty('child_lock', active);
  }

  async setSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode', enabled);
  }

  async setAngle(angle) {
    if (angle > 120) angle = 120;   // the fans only support some predifened angles so i am not sure how this will beahve
    if (angle < 0) angle = 0;
    return this.setProperty('swing_mode_angle', angle);
  }


  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 1 : 0;
    return this.setProperty('mode', mode);
  }

  async moveLeft() {
    return this.sendCommnd('set_move', 1);
  }

  async moveRight() {
    return this.sendCommnd('set_move', 2);
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

module.exports = MiotDmakerDcFan;
