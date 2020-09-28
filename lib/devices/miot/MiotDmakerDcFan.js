const MiotFan = require('./MiotFan.js');
const FanCapabilities = require('../../FanCapabilities.js');

class MiotDmakerDcFan extends MiotFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }

  // dmaker.fan.p9. dmaker.fan.p10
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:dmaker-p9:1
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:dmaker-p10:1


  /*----------========== INIT ==========----------*/

  initFanCapabilities() {
    this.addCapability(FanCapabilities.POWER_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_SPEED_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_LEVEL_CONTROL, true);
    this.addCapability(FanCapabilities.NUMBER_OF_FAN_LEVELS, 4);
    this.addCapability(FanCapabilities.OSCILLATION_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_LEVEL_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_LEVELS, [30, 60, 60, 120, 140]);
    this.addCapability(FanCapabilities.LEFT_RIGHT_MOVE, true);
    this.addCapability(FanCapabilities.NATURAL_MODE, true);
    this.addCapability(FanCapabilities.CHILD_LOCK, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER, true);
    this.addCapability(FanCapabilities.POWER_OFF_TIMER_UNIT, 'minutes');
    this.addCapability(FanCapabilities.BUZZER_CONTROL, true);
    this.addCapability(FanCapabilities.LED_CONTROL, true);

    if (fanModel === 'dmaker.fan.p9') {
      // supports both, natural and sleep mode
      this.addCapability(FanCapabilities.SLEEP_MODE, true);
    }
  }


  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define general fan properties
    this.defineProperty('power', 2, 1);
    this.defineProperty('fan_level', 2, 2);
    this.defineProperty('child_lock', 3, 1);

    // the dmaker p9 and 10 fans are basically the same, they property mapping is just different
    let fanModel = this.miioFanDevice.miioModel;

    if (fanModel === 'dmaker.fan.p9') {
      // dmaker.fan.p9
      this.defineProperty('fan_speed', 2, 11);
      this.defineProperty('swing_mode', 2, 5);
      this.defineProperty('swing_mode_angle', 2, 6);
      this.defineProperty('power_off_time', 2, 8);
      this.defineProperty('buzzer', 2, 7);
      this.defineProperty('light', 2, 9);
      this.defineProperty('mode', 2, 4);

      this.defineCommand('set_move', 2, 10);
    } else {
      // dmaker.fan.p10
      this.defineProperty('fan_speed', 2, 10);
      this.defineProperty('swing_mode', 2, 4);
      this.defineProperty('swing_mode_angle', 2, 5);
      this.defineProperty('power_off_time', 2, 6);
      this.defineProperty('buzzer', 2, 8);
      this.defineProperty('light', 2, 7);
      this.defineProperty('mode', 2, 3);

      this.defineCommand('set_move', 2, 9);
    }
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === true;
  }

  getRotationSpeed() {
    return this.getFanProperties().fan_speed;
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
    return this.getFanProperties().mode === 1;
  }

  isSleepModeEnabled() {
    return this.getFanProperties().mode === 2;
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

  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 1 : 0;
    return this.setProperty('mode', mode);
  }

  async setSleepModeEnabled(enabled) {
    let mode = enabled ? 2 : 0;
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
