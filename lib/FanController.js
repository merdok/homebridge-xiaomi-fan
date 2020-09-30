const miio = require('miio');
var EventEmitter = require('events');

const FanDeviceFactory = require('./FanDeviceFactory.js');

// Event emiter constants
const EVENT_FAN_CONNECTED = 'fanConnected';
const EVENT_FAN_DISCONNECTED = 'fanDisconnected';
const EVENT_FAN_DEVICE_READY = 'fanDeviceReady';
const EVENT_FAN_PROPERTIES_UPDATED = 'fanPropertiesUpdated';

class FanController extends EventEmitter {
  constructor(ip, token, deviceId, model, name, pollingInterval, log) {
    super();

    // config
    this.ip = ip;
    this.token = token;
    this.deviceId = deviceId;
    this.model = model;
    this.name = name;
    this.log = log || console;
    this.pollingInterval = pollingInterval || 5000;

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
      this.emit(EVENT_FAN_CONNECTED, this.fanDevice);
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
      this.fanDevice.on('fanDeviceManualPropertiesUpdate', (res) => {
        this.emit(EVENT_FAN_PROPERTIES_UPDATED, res);
      });

      this.emit(EVENT_FAN_DEVICE_READY, this.fanDevice); // notify listeners that a fan device was created
    } else if (this.fanDevice && miioDevice) {
      // if we already have a fan device then update the miioDevice
      this.fanDevice.updateMiioDevice(miioDevice);
    }
  }

  startFanPolling() {
    this.checkFanStatusInterval = setInterval(() => {
      this.fanDevice.pollProperties().then(result => {
        //this.logDebug(`Poll successful! Got data from fan!`);
        this.emit(EVENT_FAN_PROPERTIES_UPDATED, result);
      }).catch(err => {
        if (this.checkFanStatusInterval) {
          this.logDebug(`Poll failed! No response from Fan! Stopping polling! Error: ${err}`);
          clearInterval(this.checkFanStatusInterval);
          this.checkFanStatusInterval = undefined;
          this.fanDevice.disconnectAndDestroyMiioDevice();
          this.emit(EVENT_FAN_DISCONNECTED, null);
          this.logDebug(`Trying to reconnect`);
          this.startFanDiscovery();
        }
      });
    }, this.pollingInterval);
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

module.exports = FanController;
