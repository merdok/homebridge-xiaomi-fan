const BaseFan = require('./baseFan.js');

class MiotFan extends BaseFan {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, deviceId, name, pollingInterval, log);
  }


  /*----------========== SETUP ==========----------*/

  modelSpecificSetup() {
    // make sure that we have the fan deviceId, not sure if this is required for local calls even on the miot protocol(maybe only required for cloud calls)
    try {
      if (!this.deviceId) throw new Error(`Could not find deviceId for ${this.name}! deviceId is required for miot devices! Please specify a deviceId in the 'config.json' file!`);
    } catch (error) {
      this.logError(error);
      return;
    }

    // prepare/reset the variables
    this.properties = {};
    this.propertiesDefs = {};

    // define the fan properties
    this.defineProperty('power', `{"did":"${this.deviceId}", "siid": 2, "piid": 1}`);
    this.defineProperty('fanspeed', `{"did":"${this.deviceId}", "siid": 2, "piid": 2}`);
    this.defineProperty('rotate_enabled', `{"did":"${this.deviceId}", "siid": 2, "piid": 3}`);
    this.defineProperty('power_off_time', `{"did":"${this.deviceId}", "siid": 2, "piid": 10}`);
    this.defineProperty('buzzer', `{"did":"${this.deviceId}", "siid": 2, "piid": 11}`);
    this.defineProperty('light', `{"did":"${this.deviceId}", "siid": 2, "piid": 12}`);
    this.defineProperty('child_lock', `{"did":"${this.deviceId}", "siid": 3, "piid": 1}`);
    this.defineProperty('mode', `{"did":"${this.deviceId}", "siid": 2, "piid": 7}`);

    // get the properties
    this.requestAllProperties().catch(err => {
      if (this.checkFanStatusInterval) {
        this.logDebug(`Error on initial property request! Error: ${err}`);
      }
    });;
  }

  startPropertyPolling() {
    this.logDebug(`Starting property polling.`);

    this.checkFanStatusInterval = setInterval(() => {
      this.requestAllProperties().then(result => {
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

  getProtocolType() {
    return 'miot';
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.properties.power === true;
  }

  getRotationSpeed() {
    return this.properties.fanspeed * 33 || 0; // the fan has 3 levels for fan speed (no manual % set) that is why multiply the fan speed by 33
  }

  isChildLockActive() {
    return this.properties.child_lock === true;
  }

  isSwingModeEnabled() {
    return this.properties.rotate_enabled === true;
  }

  getAngle() {
    return 0; // the fan does not support angle set
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
    return this.properties.power_off_time; // returns already in minutes
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }

  getUseTime() {
    return 0; // not supported by this fan
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    return this.setProperty('power', power);
  }

  async setRotationSpeed(speed) {
    let speedLevel = 1
    if (speed < 33) {
      speedLevel = 1
    } else if (speed >= 33 && speed < 66) {
      speedLevel = 2
    } else if (speed >= 66) {
      speedLevel = 3
    }
    return this.setProperty('fanspeed', speedLevel);
  }

  async setChildLock(active) {
    return this.setProperty('child_lock', active);
  }

  async setSwingModeEnabled(enabled) {
    return this.setProperty('rotate_enabled', enabled);
  }

  async setNaturalModeEnabled(enabled) {
    let mode = enabled ? 1 : 0;
    return this.setProperty('mode', mode);
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

  /*----------========== HELPERS ==========----------*/

  defineProperty(prop, def) {
    this.properties[prop] = 0;
    this.propertiesDefs[prop] = JSON.parse(def);
  }

  pushProperty(result, name, returnObj) {
    this.properties[name] = returnObj.value;
    result[name] = returnObj.value;
  }

  async setProperty(prop, value) {
    if (this.miioFanDevice) {
      let propDef = Object.assign({}, this.propertiesDefs[prop]); // create a copy of the propDef so that we do not modify the orignal def object
      propDef.value = value;
      return this.miioFanDevice.call('set_properties', [propDef]).then(result => {
        this.logDebug(`Successfully set property ${prop} to value ${value}! Result: ${JSON.stringify(result)}`);
        // update the local prop and notifiy listeners
        this.properties[prop] = value;
        this.emit('fanPropertiesUpdated', result);
      }).catch(err => {
        this.logDebug(`Error while setting property ${prop} to value ${value}! Error: ${err}`);
      });
    } else {
      this.logDebug(`Cannot set property ${prop} to value ${value}! Device not connected!`);
    }
  }

  async requestAllProperties() {
    if (this.miioFanDevice) {
      let props = Object.keys(this.propertiesDefs).map(key => this.propertiesDefs[key]);
      let propKeys = Object.keys(this.propertiesDefs);
      return this.miioFanDevice.call('get_properties', props)
        .then(result => {
          const obj = {};
          for (let i = 0; i < result.length; i++) {
            this.pushProperty(obj, propKeys[i], result[i]);
          }
          return obj;
        }).catch(err => {
          this.logDebug(`Error while polling all properties! Error: ${err}`);
        });
    } else {
      this.logDebug(`Cannot poll all properties! Device not connected!`);
    }
  }

  // currently not used, but can be used to retrieve a isngle property value
  async requestProperty(prop) {
    if (this.miioFanDevice) {
      let propDef = this.propertiesDefs[prop];
      return this.miioFanDevice.call('get_properties', [propDef])
        .then(result => {
          this.logDebug(`Successfully updated property ${prop} value! Result: ${JSON.stringify(result)}`);
          const obj = {};
          this.pushProperty(obj, prop, result[0]);
          this.emit('fanPropertiesUpdated', result);
          return obj;
        }).catch(err => {
          this.logDebug(`Error while requesting property ${prop}! Error: ${err}`);
        });
    } else {
      this.logDebug(`Cannot update property ${prop}! Device not connected!`);
    }
  }


}

module.exports = MiotFan;
