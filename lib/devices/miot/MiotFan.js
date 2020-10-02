const BaseFan = require('../../BaseFan.js');
const Events = require('../../Events.js');

class MiotFan extends BaseFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }


  /*----------========== INIT ==========----------*/


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
    this.commandDefs = {};
  }

  addFanProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  doInitialPropertiesFetch() {
    // initial properties fetch
    this.requestAllProperties().catch(err => {
      this.logDebug(`Error on initial property request! ${err}`);
    });
  }

  async pollProperties() {
    if (this.isFanConnected()) {
      return this.requestAllProperties();
    }
    return new Promise((resolve, reject) => {
      reject(new Error('Fan not connected'));
    });
  }

  getFanProperties() {
    if (this.isFanConnected()) {
      return this.properties;
    }
    return {};
  }


  /*----------========== INFO ==========----------*/

  getProtocolType() {
    return 'miot';
  }


  /*----------========== CAPABILITIES ==========----------*/


  /*----------========== STATUS ==========----------*/


  /*----------========== COMMANDS ==========----------*/


  /*----------========== HELPERS ==========----------*/

  defineProperty(prop, siid, piid) {
    if (!prop || !siid || !piid) {
      this.logWarn(`Cannot add property! Missing required information! prop: ${prop},  siid: ${siid},  piid: ${piid}!`);
      return;
    }

    let newProp = {};
    newProp.did = this.deviceId;
    newProp.siid = siid;
    newProp.piid = piid;

    this.properties[prop] = 0;
    this.propertiesDefs[prop] = newProp;
  }

  defineCommand(cmd, siid, piid) { // have only write access permission
    if (!cmd || !siid || !piid) {
      this.logWarn(`Cannot add command! Missing required information! cmd: ${cmd},  siid: ${siid},  piid: ${piid}!`);
      return;
    }

    let newCmd = {};
    newCmd.did = this.deviceId;
    newCmd.siid = siid;
    newCmd.piid = piid;

    this.commandDefs[cmd] = newCmd;
  }

  pushProperty(result, name, returnObj) {
    if (returnObj.code === 0) {
      this.properties[name] = returnObj.value;
      result[name] = returnObj.value;
    }
  }

  async sendCommnd(cmd, value) {
    if (this.miioFanDevice) {
      let cmdDef = Object.assign({}, this.commandDefs[cmd]); // create a copy of the cmdDef so that we do not modify the orignal def object
      cmdDef.value = value;
      return this.miioFanDevice.call('set_properties', [cmdDef]).then(result => {
        this.logDebug(`Successfully send command ${cmd} with value ${value}! Result: ${JSON.stringify(result)}`);
      }).catch(err => {
        this.logDebug(`Error while executing command ${cmd} with value ${value}! ${err}`);
      });
    } else {
      return this.createErrorPromise(`Cannot execute command ${cmd} with value ${value}! Device not connected!`);
    }
  }

  async setProperty(prop, value) {
    if (this.isFanConnected()) {
      let propDef = Object.assign({}, this.propertiesDefs[prop]); // create a copy of the propDef so that we do not modify the orignal def object
      propDef.value = value;
      return this.miioFanDevice.call('set_properties', [propDef]).then(result => {
        this.logDebug(`Successfully set property ${prop} to value ${value}! Result: ${JSON.stringify(result)}`);
        // update the local prop and notifiy listeners
        this.properties[prop] = value;
        this.emit(Events.FAN_DEVICE_MANUAL_PROPERTIES_UPDATE, result);
      }).catch(err => {
        this.logDebug(`Error while setting property ${prop} to value ${value}! ${err}`);
      });
    } else {
      return this.createErrorPromise(`Cannot set property ${prop} to value ${value}! Device not connected!`);
    }
  }

  async requestAllProperties() {
    if (this.isFanConnected()) {
      let props = Object.keys(this.propertiesDefs).map(key => this.propertiesDefs[key]);
      let propKeys = Object.keys(this.propertiesDefs);
      return this.miioFanDevice.call('get_properties', props)
        .then(result => {
          const obj = {};
          for (let i = 0; i < result.length; i++) {
            this.pushProperty(obj, propKeys[i], result[i]);
          }
          return obj;
        });
      // no catch here, catch has to be handled by caller, in that case the property polling
    } else {
      return this.createErrorPromise(`Cannot poll all properties! Device not connected!`);
    }
  }

  // currently not used, but can be used to retrieve a isngle property value
  async requestProperty(prop) {
    if (this.isFanConnected()) {
      let propDef = this.propertiesDefs[prop];
      return this.miioFanDevice.call('get_properties', [propDef])
        .then(result => {
          this.logDebug(`Successfully updated property ${prop} value! Result: ${JSON.stringify(result)}`);
          const obj = {};
          this.pushProperty(obj, prop, result[0]);
          this.emit(Events.FAN_DEVICE_MANUAL_PROPERTIES_UPDATE, result);
          return obj;
        }).catch(err => {
          this.logDebug(`Error while requesting property ${prop}! ${err}`);
        });
    } else {
      return this.createErrorPromise(`Cannot update property ${prop}! Device not connected!`);
    }
  }


}

module.exports = MiotFan;
