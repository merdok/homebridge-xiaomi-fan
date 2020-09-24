const miio = require('miio');
var EventEmitter = require('events');

const COMMAND_NOT_SUPPORTED_MSG = 'Not supported: The requested command is not supported by this device!';

class BaseFan extends EventEmitter {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super();

    // config
    this.ip = ip;
    this.token = token;
    this.deviceId = deviceId;
    this.name = name;
    this.log = log || console;
    this.pollingInterval = pollingInterval || 5000;
    this.deepDebugLog = false;

    if (!this.ip) {
      this.logError(`ip required!`);
    }

    if (!this.token) {
      this.logError(`token required!`);
    }

    if (this.pollingInterval < 1000) {
      this.pollingInterval = this.pollingInterval * 1000;
    }

    //fan info
    this.miioFanDevice = undefined;
    this.fanInfo = {};
    this.checkFanStatusInterval = undefined;

    if (miioDevice) {
      // we already have the device, use that
      this.miioFanDevice = miioDevice;
      this.setupFan();
    } else {
      // connect to the fan
      this.connectToFan();
    }

  }


  /*----------========== SETUP ==========----------*/

  connectToFan() {
    let checkDelayTime = this.pollingInterval * 6; // 6 times alive polling interval
    miio.device({
      address: this.ip,
      token: this.token
    }).then(device => {
      this.logInfo(`Connected to Fan ${device.miioModel}`);
      this.miioFanDevice = device;
      this.setupFan();
    }).catch(err => {
      this.logDebug(err);
      this.logDebug(`Could not connect to the fan! Retrying in ${checkDelayTime/1000} seconds!`);
      setTimeout(() => {
        this.connectToFan();
      }, checkDelayTime);
    });
  }

  disconnectFromFan() {
    this.miioFanDevice.destroy();
    this.miioFanDevice = undefined;
  }

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

    // start property polling
    this.logDebug(`Starting property polling.`);
    this.startPropertyPolling();

    this.logDebug(`Setup finished!`);
  }

  modelSpecificSetup() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  addFanProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  doInitialPropertiesFetch() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  startPropertyPolling() {
    this.logDebug(`Needs to be implemented by devices!`);
  }


  /*----------========== INFO ==========----------*/

  isFanConnected() {
    return this.miioFanDevice !== undefined;
  }

  getFanModel() {
    return this.miioFanDevice.miioModel;
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
    return this.miioFanDevice.id.replace(/^miio:/, '');
  }


  /*----------========== CAPABILITIES ==========----------*/

  //  http://miot-spec.org/miot-spec-v2/instances?status=all
  // Smartmi fan 3:
  // https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:zhimi-za5:2

  supportsPowerControl() {
    return true; // every fan supports that?
  }

  supportFanSpeed() {
    return false; // free speed selection from 0% to 100%
  }

  supportFanSpeedRpm() {
    return false; // whether the rpm speed value can be retrieved
  }

  supportsFanLevel() {
    return false; // preconfigured fan levels which can be set
  }

  numberOfFanLevels() {
    return 0; // how many fan levels
  }

  supportsOscillation() {
    return false; // fan moves left to right
  }

  supportsOscillationAngle() {
    return false; // if the a custom angle can be set for oscillation usually 0 to 120 degree
  }

  oscillationAngleRange() {
    return []; // range for oscillation angle
  }

  supportsOscillationLevels() {
    return false; // preconfigured levels for oscillation
  }

  oscillationLevels() {
    return []; // array of levels (in degree) for oscillation
  }

  supportsLeftRightMove() {
    return false; // whether the fan can be rotated left or right by 5 degree
  }

  supportsNaturalMode() {
    return false; // whether the natural mode is supported
  }

  supportsSleepMode() {
    return false; // whether the sleep mode is supported
  }

  supportsChildLock() {
    return false; // should be clear
  }

  supportsPowerOffTimer() {
    return false; // if a power off timer can be configured
  }

  powerOffTimerUnit() {
    return ''; // the unit of the power off timer
  }

  supportsBuzzerControl() {
    return false; // if buzzer can be configured
  }

  supportsBuzzerLevels() {
    return false; // if buzzer can be set to different value
  }

  supportsLedControl() {
    return false; // if indicator light can be configured
  }

  supportsLedLevels() {
    return false; // if indicator light can be set to different value
  }

  supportsUseTime() {
    return false; // whether the fan returns use time
  }

  supportsIoniser() {
    return false; // whether the fan has a built in ioniser which can be controled
  }

  supportsTemperature() {
    return false; // whether the fan has a built in temperature sensor which can be read
  }

  supportsRelativeHumidity() {
    return false; // whether the fan has a built in humidity sensor which can be read
  }

  hasBuiltInBattery() {
    return false; // whether the fan has a built in battery
  }

  supportsBatteryStateReporting() {
    return false; // whether the fan reports the state of the built in battery
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return false;
  }

  getRotationSpeed() {
    return 0;
  }

  isChildLockActive() {
    return false;
  }

  isSwingModeEnabled() {
    return false;
  }

  isNaturalModeEnabled() {
    return false;
  }

  getBuzzerLevel() {
    return this.isBuzzerEnabled() === true ? 1 : 0;
  }

  isBuzzerEnabled() {
    return false;
  }

  getLedLevel() {
    return this.isLedEnabled() === true ? 1 : 0;
  }

  isLedEnabled() {
    return false;
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

  getTemperature(){
    return 0;
  }

  getRelativeHumidity(){
    return 0;
  }

  getBatteryLevel(){
    return 0;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setRotationSpeed(speed) {
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

  async setNaturalModeEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveLeft() {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveRight() {
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

  async setShutdownTimer(minutes) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }

  async setIoniserEnabled(enabled) {
    this.logWarn(COMMAND_NOT_SUPPORTED_MSG);
  }


  /*----------========== HELPERS ==========----------*/


  /*----------========== LOG ==========----------*/

  logInfo(message, ...args) {
    this.log.info(`[${this.name}] ` + message, ...args);
  }

  logWarn(message, ...args) {
    this.log.warn(`[${this.name}] ` + message, ...args);
  }

  logDebug(message, ...args) {
    this.log.debug(`[${this.name}] ` + message, ...args);
  }

  logError(message, ...args) {
    this.log.error(`[${this.name}] [ERROR] ` + message, ...args);
  }

}

module.exports = BaseFan;
