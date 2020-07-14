const miio = require('miio');
var EventEmitter = require('events');

const NOT_SUPPORTED_MSG = 'The requested command not supported is not supported by this device!';

class BaseFan extends EventEmitter {
  constructor(miioDevice, ip, token, name, pollingInterval, log) {
    super();

    // config
    this.ip = ip;
    this.token = token;
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

    // add the defined properties to the device
    this.logDebug(`Adding properties to fan device.`);
    this.addPropertiesToFan();

    // start property polling
    this.startPropertyPolling();

    this.logDebug(`Setup finished!`);
  }

  addPropertiesToFan() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  startPropertyPolling() {
    this.logDebug(`Starting property polling.`);

    this.checkFanStatusInterval = setInterval(() => {
      this.miioFanDevice.poll().then(result => {
        //  this.logDebug(`Poll successful! Got data from fan!`);
        this.emit('fanPropertiesUpdated', result);
      }).catch(err => {
        if (this.checkFanStatusInterval) {
          this.logDebug(`Poll failed! No response from Fan! Stopping polling! Error: ${err}`);
          clearInterval(this.checkFanStatusInterval);
          this.checkFanStatusInterval = undefined;
          this.logDebug(`Trying to reconnect`);
          this.connectToFan();
        }
      });
    }, this.pollingInterval);
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
    this.logWarn(NOT_SUPPORTED_MSG);
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

  async sendCommand(cmd, value, refresh, refreshDelay = 200) {
    if (this.miioFanDevice) {
      return this.miioFanDevice.call(cmd, [value], {
        refresh: refresh,
        refreshDelay: refreshDelay
      }).then(result => {
        this.logDebug(`Successfully executed ${cmd} with value ${value}! Result: ${result}`);
      }).catch(err => {
        this.logDebug(`Error while executing ${cmd} with value ${value}! Error: ${err}`);
      });
    } else {
      this.logDebug(`Cannot execute ${cmd} with value ${value}! Device not connected!`);
    }
  }


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
