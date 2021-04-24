const miio = require('miio');
var EventEmitter = require('events');
const FanCapabilities = require('./FanCapabilities.js');

// general constants
const COMMAND_NOT_SUPPORTED_MSG = 'Not supported: The requested command is not supported by this device!';

// DEVICES: http://miot-spec.org/miot-spec-v2/instances?status=all

class BaseFan extends EventEmitter {
  constructor(miioDevice, model, deviceId, name, log) {
    super();

    // config
    this.deviceId = deviceId;
    this.model = model;
    this.name = name;
    this.log = log || console;
    this.deepDebugLog = false;

    //fan info
    this.miioFanDevice = undefined;
    this.fanInfo = {};

    // prepare the variables
    this.capabilities = {};

    // init fan capabilities
    this.initFanCapabilities()

    // if we construct with a miiodevice then we can start with the setup
    if (miioDevice) {
      this.miioFanDevice = miioDevice;
      this.setupFan();
    }

  }


  /*----------========== INIT ==========----------*/

  initFanCapabilities() {
    this.addCapability(FanCapabilities.POWER_CONTROL, true);
  }


  /*----------========== SETUP ==========----------*/

  setupFan() {
    this.logDebug(`Setting up fan!`);

    // get the fan info
    this.logDebug(`Getting device info.`);
    this.miioFanDevice.management.info().then((info) => {
      this.fanInfo = info;
    }).catch(err => {
      this.logDebug(`Could not retrieve device info: ${err}`);
    });

    // get the fan deviceId if not specified
    if (!this.deviceId) {
      this.deviceId = this.getDeviceId();
      this.logDebug(`Got fan did: ${this.deviceId}.`);
    }

    // do a model specific fan setup
    this.logDebug(`Doing model specific setup.`);
    this.modelSpecificSetup();

    // add properties to the fan
    this.logDebug(`Adding properties to fan.`);
    this.addFanProperties();

    // initial properties fetch
    this.logDebug(`Doing initial properties fetch.`);
    this.doInitialPropertiesFetch();

    this.logDebug(`Setup finished! Fan can now be controlled!`);
  }


  /*----------========== DEVICE CONTROL ==========----------*/

  disconnectAndDestroyMiioDevice() {
    if (this.miioFanDevice) {
      this.miioFanDevice.destroy();
    }
    this.miioFanDevice = undefined;
  }

  updateMiioDevice(newMiioDevice) {
    this.miioFanDevice = newMiioDevice;
    this.setupFan();
  }


  /*----------========== DEVICE LIFECYCLE ==========----------*/

  modelSpecificSetup() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  addFanProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  doInitialPropertiesFetch() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  async pollProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  getFanProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }


  /*----------========== INFO ==========----------*/

  isFanConnected() {
    return this.miioFanDevice !== undefined;
  }

  getFanModel() {
    if (this.isFanConnected()) {
      return this.miioFanDevice.miioModel;
    }
    return this.model;
  }

  isDmakerFan() {
    return this.getFanModel().includes('dmaker');
  }

  isSmartmiFan() {
    return this.getFanModel().includes('zhimi');
  }

  getFanInfo() {
    return this.fanInfo;
  }

  getProtocolType() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  isMiioDevice() {
    return this.getProtocolType() === 'miio';
  }

  isMiotDevice() {
    return this.getProtocolType() === 'miot';
  }

  getDeviceId() {
    if (this.isFanConnected()) {
      return this.miioFanDevice.id.replace(/^miio:/, '');
    }
    return this.deviceId;
  }


  /*----------========== CAPABILITIES ==========----------*/

  supportsPowerControl() {
    return this.capabilities[FanCapabilities.POWER_CONTROL] || true; // every fan supports that? on/off
  }

  supportsFanSpeed() {
    return this.capabilities[FanCapabilities.FAN_SPEED_CONTROL] || false; // free speed selection from 0% to 100%
  }

  supportsFanSpeedRpmReporting() {
    return this.capabilities[FanCapabilities.FAN_SPEED_RPM_REPORTING] || false; // whether the fan reports the rpm speed value
  }

  supportsFanLevel() {
    return this.capabilities[FanCapabilities.FAN_LEVEL_CONTROL] || false; // preconfigured fan levels which can be set
  }

  numberOfFanLevels() {
    return this.capabilities[FanCapabilities.NUMBER_OF_FAN_LEVELS] || 0; // how many fan levels
  }

  supportsOscillation() {
    return this.capabilities[FanCapabilities.OSCILLATION_CONTROL] || false; // fan moves left to right on/off
  }

  supportsOscillationAngle() {
    return this.capabilities[FanCapabilities.OSCILLATION_ANGLE_CONTROL] || false; // if a custom angle can be set for oscillation usually 0 to 120 degree
  }

  oscillationAngleRange() {
    return this.capabilities[FanCapabilities.OSCILLATION_ANGLE_RANGE] || []; // range for oscillation angle
  }

  supportsOscillationLevels() {
    return this.capabilities[FanCapabilities.OSCILLATION_LEVEL_CONTROL] || false; // preconfigured levels for oscillation
  }

  oscillationLevels() {
    return this.capabilities[FanCapabilities.OSCILLATION_LEVELS] || []; // array of levels (in degree) for oscillation
  }

  supportsVerticalOscillation() {
    return this.capabilities[FanCapabilities.OSCILLATION_VERTICAL_CONTROL] || false; // fan moves up to down on/off
  }

  supportsVerticalOscillationAngle() {
    return this.capabilities[FanCapabilities.OSCILLATION_VERTICAL_ANGLE_CONTROL] || false; // if a custom angle can be set for vertical oscillation usually 0 to 90 degree
  }

  oscillationVerticalAngleRange() {
    return this.capabilities[FanCapabilities.OSCILLATION_VERTICAL_ANGLE_RANGE] || []; // range for vertical oscillation angle
  }

  supportsOscillationVerticalLevels() {
    return this.capabilities[FanCapabilities.OSCILLATION_VERTICAL_LEVEL_CONTROL] || false; // preconfigured levels for vertical oscillation
  }

  oscillationVerticalLevels() {
    return this.capabilities[FanCapabilities.OSCILLATION_VERTICAL_LEVELS] || []; // array of levels (in degree) for oscillation
  }


  supportsLeftRightMove() {
    return this.capabilities[FanCapabilities.LEFT_RIGHT_MOVE] || false; // whether the fan can be rotated left or right by 5 degree
  }

  supportsUpDownMove() {
    return this.capabilities[FanCapabilities.UP_DOWN_MOVE] || false; // whether the fan can be rotated up or down by 5 degree
  }

  supportsNaturalMode() {
    return this.capabilities[FanCapabilities.NATURAL_MODE] || false; // whether the natural mode is supported on/off
  }

  supportsSleepMode() {
    return this.capabilities[FanCapabilities.SLEEP_MODE] || false; // whether the sleep mode is supported on/off
  }

  supportsChildLock() {
    return this.capabilities[FanCapabilities.CHILD_LOCK] || false; // should be clear on/off
  }

  supportsPowerOffTimer() {
    return this.capabilities[FanCapabilities.POWER_OFF_TIMER] || false; // if a power off timer can be configured
  }

  powerOffTimerUnit() {
    return this.capabilities[FanCapabilities.POWER_OFF_TIMER_UNIT] || ''; // the unit of the power off timer
  }

  supportsBuzzerControl() {
    return this.capabilities[FanCapabilities.BUZZER_CONTROL] || false; // if buzzer can be configured on/off
  }

  supportsBuzzerLevelControl() {
    return this.capabilities[FanCapabilities.BUZZER_LEVEL_CONTROL] || false; // if buzzer can be set to different levels eg 0,1,2
  }

  buzzerLevels() {
    return this.capabilities[FanCapabilities.BUZZER_LEVELS] || []; // array of levels (in degree) for buzzer
  }

  supportsLedControl() {
    return this.capabilities[FanCapabilities.LED_CONTROL] || false; // if indicator light can be configured on/off
  }

  supportsLedLevelControl() {
    return this.capabilities[FanCapabilities.LED_LEVEL_CONTROL] || false; // if indicator light can be set to different levels eg 0,1,2
  }

  ledLevels() {
    return this.capabilities[FanCapabilities.LED_LEVELS] || []; // array of levels (in degree) for indicator light
  }

  supportsLedBrightness() {
    return this.capabilities[FanCapabilities.LED_CONTROL_BRIGHTNESS] || false; // if indicator light can be controlled like a light bulb with 0 to 100% percent values
  }

  supportsUseTimeReporting() {
    return this.capabilities[FanCapabilities.USE_TIME_REPORTING] || false; // whether the fan returns use time
  }

  supportsIoniser() {
    return this.capabilities[FanCapabilities.IONISER_CONTROL] || false; // whether the fan has a built in ioniser which can be controled on/off
  }

  supportsTemperatureReporting() {
    return this.capabilities[FanCapabilities.TEMPERATURE_REPORTING] || false; // whether the fan has a built in temperature sensor which can be read
  }

  supportsRelativeHumidityReporting() {
    return this.capabilities[FanCapabilities.HUMIDITY_REPORTING] || false; // whether the fan has a built in humidity sensor which can be read
  }

  hasBuiltInBattery() {
    return this.capabilities[FanCapabilities.BUILT_IN_BATTERY] || false; // whether the fan has a built in battery
  }

  supportsBatteryStateReporting() {
    return this.capabilities[FanCapabilities.BATTERY_STATE_REPORTING] || false; // whether the fan reports the state of the built in battery
  }

  /*----------========== CAPABILITY HELPERS ==========----------*/

  /*--== oscillation angle ==--*/

  adjustOscillationAngleToRange(angle) {
    if (this.supportsOscillationAngle() && this.oscillationAngleRange().length == 2) {
      let low = this.oscillationAngleRange()[0];
      let high = this.oscillationAngleRange()[1];
      if (angle > high) angle = high;
      if (angle < low) angle = low;
      return angle;
    }
    return angle;
  }

  checkOscillationAngleWithinRange(angle) {
    if (this.supportsOscillationAngle() && this.oscillationAngleRange().length == 2) {
      let low = this.oscillationAngleRange()[0];
      let high = this.oscillationAngleRange()[1];
      if (angle >= low && angle <= high) {
        return true;
      }
    }
    return false;
  }

  /*--== oscillation levels ==--*/

  checkOscillationLevelSupported(angle) {
    if (this.supportsOscillationLevels()) {
      if (this.oscillationLevels().includes(angle)) {
        return true;
      }
    }
    return false;
  }

  /*--== vertical oscillation angle ==--*/

  adjustVerticalOscillationAngleToRange(angle) {
    if (this.supportsVerticalOscillationAngle() && this.oscillationVerticalAngleRange().length == 2) {
      let low = this.oscillationVerticalAngleRange()[0];
      let high = this.oscillationVerticalAngleRange()[1];
      if (angle > high) angle = high;
      if (angle < low) angle = low;
      return angle;
    }
    return angle;
  }

  checkVerticalOscillationAngleWithinRange(angle) {
    if (this.supportsVerticalOscillationAngle() && this.oscillationVerticalAngleRange().length == 2) {
      let low = this.oscillationVerticalAngleRange()[0];
      let high = this.oscillationVerticalAngleRange()[1];
      if (angle >= low && angle <= high) {
        return true;
      }
    }
    return false;
  }

  /*--== vertical oscillation levels ==--*/

  checkVerticalOscillationLevelSupported(angle) {
    if (this.supportsOscillationVerticalLevels()) {
      if (this.oscillationVerticalLevels().includes(angle)) {
        return true;
      }
    }
    return false;
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return false;
  }

  getRotationSpeed() {
    return 0;
  }

  getSpeed() {
    return 0;
  }

  getFanLevel() {
    return 0;
  }

  isChildLockActive() {
    return false;
  }

  isSwingModeEnabled() {
    return false;
  }

  isVerticalSwingModeEnabled() {
    return false;
  }

  isNaturalModeEnabled() {
    return false;
  }

  isSleepModeEnabled() {
    return false;
  }

  isBuzzerEnabled() {
    return false;
  }

  getBuzzerLevel() {
    return this.isBuzzerEnabled() === true ? 1 : 0;
  }

  isLedEnabled() {
    return false;
  }

  getLedLevel() {
    return 0;
  }

  getLedBrightness() {
    return 0;
  }

  getShutdownTimer() {
    return 0;
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }

  getUseTime() {
    return 0;
  }

  isIoniserEnabled() {
    return false;
  }

  getTemperature() {
    return 0;
  }

  getRelativeHumidity() {
    return 0;
  }

  getBatteryLevel() {
    return 0;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setRotationSpeed(speed) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setFanLevel(level) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setChildLock(active) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setSwingModeEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setAngle(angle) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setVerticalSwingModeEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setVerticalAngle(angle) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setNaturalModeEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setSleepModeEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveLeft() {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveRight() {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveUp() {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveDown() {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setBuzzerEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setBuzzerLevel(level) {
    // generic implementation for fans that does not support buzzer level
    let enabled = this.getBuzzerLevel() === 0 ? false : true;
    this.setBuzzerEnabled(enabled);
  }

  async setLedEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setLedLevel(level) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setLedBrightness(brightness) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setShutdownTimer(minutes) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setIoniserEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }


  /*----------========== HELPERS ==========----------*/

  createErrorPromise(msg) {
    return new Promise((resolve, reject) => {
      reject(new Error(msg));
    }).catch(err => {
      this.logDebug(err);
    });
  }

  addCapability(name, value) {
    this.capabilities[name] = value;
  }

  getSafePropertyValue(value, safe) {
    if (value === undefined) {
      return safe;
    }
    return value;
  }


  /*----------========== LOG ==========----------*/

  logInfo(message, ...args) {
    this.log.info((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

  logWarn(message, ...args) {
    this.log.warn((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

  logDebug(message, ...args) {
    this.log.debug((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

  logError(message, ...args) {
    this.log.error((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

}

module.exports = BaseFan;
