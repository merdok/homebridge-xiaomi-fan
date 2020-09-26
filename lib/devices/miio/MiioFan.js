const BaseFan = require('../../BaseFan.js');

class MiioFan extends BaseFan {
  constructor(miioDevice, ip, token, model, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, model, deviceId, name, pollingInterval, log);
  }

  /*----------========== SETUP ==========----------*/

  modelSpecificSetup() {
    // none for miio fans
  }

  addFanProperties() {
    this.logDebug(`Needs to be implemented by devices!`);
  }

  doInitialPropertiesFetch() {
    // initial properties fetch
    this.miioFanDevice._loadProperties();
  }

  async pollProperties() {
    if (this.isFanConnected()) {
      return this.miioFanDevice.poll();
    }
    return new Promise((resolve, reject) => {
      reject(new Error('Fan not connected'));
    });
  }

  getFanProperties() {
    if (this.isFanConnected()) {
      return this.miioFanDevice.miioProperties();
    }
    return {};
  }


  /*----------========== INFO ==========----------*/

  getProtocolType() {
    return 'miio';
  }


  /*----------========== CAPABILITIES ==========----------*/


  /*----------========== STATUS ==========----------*/


  /*----------========== COMMANDS ==========----------*/


  /*----------========== HELPERS ==========----------*/

  async sendCommand(cmd, value, refresh, refreshDelay = 200) {
    if (this.isFanConnected()) {
      return this.miioFanDevice.call(cmd, [value], {
        refresh: refresh,
        refreshDelay: refreshDelay
      }).then(result => {
        this.logDebug(`Successfully executed ${cmd} with value ${value}! Result: ${result}`);
      }).catch(err => {
        this.logDebug(`Error while executing ${cmd} with value ${value}! Error: ${err}`);
      });
    } else {
      return this.createErrorPromise(`Cannot execute ${cmd} with value ${value}! Device not connected!`);
    }
  }

}

module.exports = MiioFan;
