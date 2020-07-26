const miio = require('miio');
var EventEmitter = require('events');

const NOT_SUPPORTED_MSG = 'The requested command not supported is not supported by this device!';

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
    });

    // get the fan deviceId if not specified
    if (!this.deviceId) {
      this.deviceId = this.miioFanDevice.id.replace(/^miio:/, '');
      this.logDebug(`Got fan did: ${this.deviceId}.`);
    }

    // do a model specific fan setup, like adding properties
    this.logDebug(`Doing model specific setup.`);
    this.modelSpecificSetup();

    // start property polling
    this.startPropertyPolling();

    this.logDebug(`Setup finished!`);
  }

  modelSpecificSetup() {
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

  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  getRotationSpeed() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  isChildLockActive() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  isSwingModeEnabled() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  isNaturalModeEnabled() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  getBuzzerLevel() {
    // generic implementation for fans that does not support buzzer level
    return this.isBuzzerEnabled() === true ? 1 : 0;
  }

  isBuzzerEnabled() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  getLedLevel() {
    // generic implementation for fans that does not support buzzer level
    return this.isLedEnabled() === true ? 0 : 2;
  }

  isLedEnabled() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  getShutdownTimer() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  isShutdownTimerEnabled() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  getUseTime() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setRotationSpeed(speed) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setChildLock(active) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setSwingModeEnabled(enabled) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setAngle(angle) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setNaturalModeEnabled(enabled) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async moveLeft() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async moveRight() {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setBuzzerEnabled(enabled) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setBuzzerLevel(level) {
    // generic implementation for fans that does not support buzzer level
    let enabled = this.getBuzzerLevel() === 0 ? false : true;
    this.setBuzzerEnabled(enabled);
  }

  async setLedEnabled(enabled) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setLedLevel(level) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }

  async setShutdownTimer(minutes) {
    this.logWarn(NOT_SUPPORTED_MSG);
  }


  /*----------========== HELPERS ==========----------*/


  /*----------========== LOG ==========----------*/

  logInfo(message, ...args) {
    this.log.info(message, ...args);
  }

  logWarn(message, ...args) {
    this.log.warn(message, ...args);
  }

  logDebug(message, ...args) {
    this.log.debug(message, ...args);
  }

  logError(message, ...args) {
    this.log.error(`[ERROR] ` + message, ...args);
  }

}

module.exports = BaseFan;
