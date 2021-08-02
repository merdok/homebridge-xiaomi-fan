const MiotFan = require('./MiotFan.js');
const FanCapabilities = require('../../FanCapabilities.js');

class AirFanCa23ad9 extends MiotFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }

  // air.fan.ca23ad9
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:air-ca23ad9:1


  /*----------========== INIT ==========----------*/

  initFanCapabilities() {
    this.addCapability(FanCapabilities.POWER_CONTROL, true);
    this.addCapability(FanCapabilities.FAN_LEVEL_CONTROL, true);
    this.addCapability(FanCapabilities.NUMBER_OF_FAN_LEVELS, 4); // 1-32 reduce to 4, so 8 per level
    this.addCapability(FanCapabilities.OSCILLATION_CONTROL, true);
    this.addCapability(FanCapabilities.OSCILLATION_VERTICAL_CONTROL, true);
  }


  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define general fan properties
    this.defineProperty('power', 2, 1);
    this.defineProperty('fan_level', 2, 2);
    this.defineProperty('swing_mode', 2, 3);
    this.defineProperty('swing_mode_vertical', 2, 4);
    this.defineProperty('mode', 2, 5);
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === true;
  }

  getFanLevel() {
    return Math.floor(this.getFanProperties().fan_level / 8);
  }

  isSwingModeEnabled() {
    return this.getFanProperties().swing_mode === true;
  }

  isVerticalSwingModeEnabled() {
    return this.getFanProperties().swing_mode_vertical === true;
  }

  isNaturalModeEnabled() {
    return this.getFanProperties().mode === 2;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.setProperty('power', power);
  }

  async setFanLevel(level) {
    return this.setProperty('fan_level', level * 8);
  }

  async setSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode', enabled);
  }

  async setVerticalSwingModeEnabled(enabled) {
    return this.setProperty('swing_mode_vertical', enabled);
  }

  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 1 : 2;
    return this.setProperty('mode', mode);
  }

}

module.exports = AirFanCa23ad9;
