const BaseFan = require('../../BaseFan.js');

class MiioFan extends BaseFan {
  constructor(miioDevice, ip, token, model, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, model, deviceId, name, pollingInterval, log);
  }


  /*----------========== INIT ==========----------*/


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

  getFanLevel() {
    let level = 1
    let rotSpeed = this.getRotationSpeed();
    if (rotSpeed >= 1 && rotSpeed <= 20) {
      level = 1;
    } else if (rotSpeed > 20 && rotSpeed <= 50) {
      level = 2;
    } else if (rotSpeed > 50 && rotSpeed <= 80) {
      level = 3;
    } else if (rotSpeed > 80) {
      level = 4;
    }
    return level;
  }


  /*----------========== COMMANDS ==========----------*/

  async setFanLevel(level) {
    // emulated fan levels, miot protocol supports it and the xiaomi home app has it, so let's also add it
    let rotationSpeed = 1;
    if (level === 1) {
      rotationSpeed = 1;
    } else if (level === 2) {
      rotationSpeed = 35;
    } else if (level === 3) {
      rotationSpeed = 74;
    } else if (level === 4) {
      rotationSpeed = 100;
    }
    return this.setRotationSpeed(rotationSpeed);
  }


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
