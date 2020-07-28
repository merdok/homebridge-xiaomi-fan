const BaseFan = require('../baseFan.js');

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
    this.commandDefs = {};
  }

  addFanProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  doInitialPropertiesFetch() {
    // initial properties fetch
    this.requestAllProperties().catch(err => {
      this.logDebug(`Error on initial property request! Error: ${err}`);
    });
  }

  startPropertyPolling() {
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


  /*----------========== CAPABILITIES ==========----------*/


  /*----------========== STATUS ==========----------*/


  /*----------========== COMMANDS ==========----------*/


  /*----------========== HELPERS ==========----------*/

  defineProperty(prop, siid, piid) {
    if(!prop || !siid || !piid){
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

  defineCommand(cmd, siid, piid) {
    if(!cmd || !siid || !piid){
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
    if(returnObj.code && returnObj.code > 0){
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
        this.logDebug(`Error while executing command ${cmd} with value ${value}! Error: ${err}`);
      });
    } else {
      this.logDebug(`Cannot execute command ${cmd} with value ${value}! Device not connected!`);
    }
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
