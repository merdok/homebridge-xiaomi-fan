const MiioSmartmiFan = require('./miio/miioSmartmiFan.js');
const MiioDmakerFanP5 = require('./miio/miioDmakerFanP5.js');
const MiotDmakerAcFan = require('./miot/miotDmakerAcFan.js');
const MiotFan = require('./miot/miotFan.js');

const SMARTMI_MIIO_DEVICES = ['zhimi.fan.sa1', 'zhimi.fan.za1', 'zhimi.fan.za3', 'zhimi.fan.za4'];
const DMAKER_MIIO_DEVICES = ['dmaker.fan.p5'];
const DMAKER_AC_MIOT_DEVICES = ['dmaker.fan.1c'];
//const DMAKER_DC_MIOT_DEVICES = ['dmaker.fan.1c'];

class FanDeviceFactory {

  static createFanDevice(miioDevice, ip, token, deviceId, name, pollingInterval, log, xiaomiFanDevice) {
    let fanDevice = null;

    if(miioDevice){
      let fanModel = miioDevice.miioModel;

      if (SMARTMI_MIIO_DEVICES.includes(fanModel)) {
        // do smartmi miio stuff
        xiaomiFanDevice.logDebug(`Creating SmartmiFan device!`);
        fanDevice = new MiioSmartmiFan(miioDevice, ip, token, deviceId, name, pollingInterval, log);
      } else if (DMAKER_MIIO_DEVICES.includes(fanModel)) {
        // do dmaker miio stuff
        xiaomiFanDevice.logDebug(`Creating DmakerFan device!`);
        fanDevice = new MiioDmakerFanP5(miioDevice, ip, token, deviceId, name, pollingInterval, log);
      } else if (DMAKER_AC_MIOT_DEVICES.includes(fanModel)) {
        // do dmaker miot ac stuff
        xiaomiFanDevice.logDebug(`Creating MiotAcFan device!`);
        fanDevice = new MiotDmakerAcFan(miioDevice, ip, token, deviceId, name, pollingInterval, log);
      } else {
        //miot stuff, if none of the above found then just do miot stuff since all new devices will use that
        xiaomiFanDevice.logDebug(`Creating MiotFan device!`);
        fanDevice = new MiotFan(miioDevice, ip, token, deviceId, name, pollingInterval, log);
      }
    }

    return fanDevice;
  }

}

module.exports = FanDeviceFactory;