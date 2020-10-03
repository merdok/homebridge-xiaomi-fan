const miio = require('miio');
var EventEmitter = require('events');
const FanDeviceFactory = require('./FanDeviceFactory.js');
const Events = require('./Events.js');

class FanController extends EventEmitter {
  constructor(ip, token, deviceId, model, name, pollingInterval, log) {
    super();

    // config
    this.ip = ip;
    this.token = token;
    this.deviceId = deviceId;
    this.model = model;
    this.name = name;
    this.pollingInterval = pollingInterval || 5000;
    this.log = log || console;
    this.deepDebugLog = false;

    if (!this.ip) {
      this.logError(`ip required!`);
    }

    if (!this.token) {
      this.logError(`token required!`);
    }

    //variables
    this.fanDevice = undefined;
    this.checkFanStatusInterval = undefined;
  }

  connectToFan() {
    if (this.model && this.model.length > 0) {
      this.logDebug(`Cached fan model ${this.model} found! Creating fan device!`);
      this.createFanDevice(null, this.model); // we have model info so we already know what fan we are dealing with
      this.startFanDiscovery(); // try to connect to the fan
    } else {
      this.logDebug(`Fan model unknown! Starting discovery!`);
      this.startFanDiscovery();
    }
  }

  startFanDiscovery() {
    let checkDelayTime = this.pollingInterval * 6; // 6 times alive polling interval
    miio.device({
      address: this.ip,
      token: this.token
    }).then(device => {
      this.logInfo(`Connected to Fan ${device.miioModel}`);
      this.createFanDevice(device, null);
      this.startFanPolling();
      this.emit(Events.FAN_CONNECTED, this.fanDevice);
    }).catch(err => {
      this.logDebug(err);
      this.logDebug(`Could not connect to the fan! Retrying in ${checkDelayTime/1000} seconds!`);
      if (this.fanDevice) {
        this.fanDevice.disconnectAndDestroyMiioDevice();
      }
      setTimeout(() => {
        this.startFanDiscovery();
      }, checkDelayTime);
    });
  }

  createFanDevice(miioDevice, model) {
    // if we do not have a fanDevice yet then create one and notify listeners
    if ((miioDevice || model) && !this.fanDevice) {

      // create the fan device
      this.fanDevice = FanDeviceFactory.createFanDevice(miioDevice, model, this.deviceId, this.name, this.log, this);

      // on manual properties update propagate that to the accessory
      this.fanDevice.on(Events.FAN_DEVICE_MANUAL_PROPERTIES_UPDATE, (res) => {
        this.emit(Events.FAN_PROPERTIES_UPDATED, res);
      });

      this.emit(Events.FAN_DEVICE_READY, this.fanDevice); // notify listeners that a fan device was created
    } else if (this.fanDevice && miioDevice) {
      // if we already have a fan device then update the miioDevice
      this.fanDevice.updateMiioDevice(miioDevice);
    }
  }

  startFanPolling() {
    this.checkFanStatusInterval = setInterval(() => {
      this.fanDevice.pollProperties().then(result => {
        //this.logDebug(`Poll successful! Got data from fan!`);
        this.emit(Events.FAN_PROPERTIES_UPDATED, result);
        this.logDeepDebug(`Updated properties: \n ${JSON.stringify(this.fanDevice.getFanProperties(), null, 2)}`);
      }).catch(err => {
        if (this.checkFanStatusInterval) {
          this.logDebug(`Poll failed! No response from Fan! Stopping polling! Error: ${err}`);
          clearInterval(this.checkFanStatusInterval);
          this.checkFanStatusInterval = undefined;
          this.fanDevice.disconnectAndDestroyMiioDevice();
          this.emit(Events.FAN_DISCONNECTED, null);
          this.logDebug(`Trying to reconnect`);
          this.startFanDiscovery();
        }
      });
    }, this.pollingInterval);
  }




  /*----------========== LOG ==========----------*/

  setDeepDebugLogEnabled(enabled) {
    this.deepDebugLog = enabled;
  }

  isDeepDebugLogEnabled() {
    return this.deepDebugLog;
  }

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

  // extended
  logDeepDebug(message, ...args) {
    if (this.isDeepDebugLogEnabled() === true) {
      this.logDebug(message, ...args)
    }
  }

}

module.exports = FanController;
