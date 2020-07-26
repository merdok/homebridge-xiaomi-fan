const BaseFan = require('./baseFan.js');

class MiioFan extends BaseFan {
  constructor(miioDevice, ip, token, deviceId, name, pollingInterval, log) {
    super(miioDevice, ip, token, deviceId, name, pollingInterval, log);
  }

  /*----------========== SETUP ==========----------*/

  modelSpecificSetup() {
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

  getProtocolType() {
    return 'miio';
  }

  /*----------========== STATUS ==========----------*/


  /*----------========== COMMANDS ==========----------*/


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

}

module.exports = MiioFan;
