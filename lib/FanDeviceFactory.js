const MiioSmartmiFan = require('./devices/miio/MiioSmartmiFan.js');
const MiioDmakerFanP5 = require('./devices/miio/MiioDmakerFanP5.js');
const MiotDmakerAcFan = require('./devices/miot/MiotDmakerAcFan.js');
const MiotDmakerDcFan = require('./devices/miot/MiotDmakerDcFan.js');
const MiotSmartmiDcFan = require('./devices/miot/MiotSmartmiDcFan.js');
const MiotGenericFan = require('./devices/miot/MiotGenericFan.js');

const SMARTMI_MIIO_DEVICES = ['zhimi.fan.v2', 'zhimi.fan.v3', 'zhimi.fan.sa1', 'zhimi.fan.za1', 'zhimi.fan.za3', 'zhimi.fan.za4'];
const DMAKER_MIIO_DEVICES = ['dmaker.fan.p5'];
const DMAKER_AC_MIOT_DEVICES = ['dmaker.fan.1c'];
const DMAKER_DC_MIOT_DEVICES = ['dmaker.fan.p9', 'dmaker.fan.p10'];
const SMARTMI_DC_MIOT_DEVICES = ['zhimi.fan.za5'];

class FanDeviceFactory {

  static createFanDevice(miioDevice, model, deviceId, name, log, fanController) {
    let fanDevice = null;

    if (miioDevice || model) {

      // if miio device instance specified then try to get model info from there, else use the specified model
      let fanModel = miioDevice ? miioDevice.miioModel : model;

      if (SMARTMI_MIIO_DEVICES.includes(fanModel)) {
        // do smartmi miio stuff
        fanController.logDebug(`Creating SmartmiFan device!`);
        fanDevice = new MiioSmartmiFan(miioDevice, fanModel, deviceId, name, log);
      } else if (DMAKER_MIIO_DEVICES.includes(fanModel)) {
        // do dmaker miio stuff
        fanController.logDebug(`Creating DmakerFan device!`);
        fanDevice = new MiioDmakerFanP5(miioDevice, fanModel, deviceId, name, log);
      } else if (DMAKER_AC_MIOT_DEVICES.includes(fanModel)) {
        // do dmaker miot ac stuff
        fanController.logDebug(`Creating MiotDmakerAcFan device!`);
        fanDevice = new MiotDmakerAcFan(miioDevice, fanModel, deviceId, name, log);
      } else if (DMAKER_DC_MIOT_DEVICES.includes(fanModel)) {
        // do dmaker miot dc stuff
        fanController.logDebug(`Creating MiotDmakerDcFan device!`);
        fanDevice = new MiotDmakerDcFan(miioDevice, fanModel, deviceId, name, log);
      } else if (SMARTMI_DC_MIOT_DEVICES.includes(fanModel)) {
        // do smartmi miot dc stuff
        fanController.logDebug(`Creating MiotSmartmiDcFan device!`);
        fanDevice = new MiotSmartmiDcFan(miioDevice, fanModel, deviceId, name, log);
      } else {
        //miot generic stuff, if none of the above found then just do miot generic stuff since all new devices will use that
        fanController.logDebug(`Creating MiotGenericFan device!`);
        fanDevice = new MiotGenericFan(miioDevice, fanModel, deviceId, name, log);
      }
    }

    return fanDevice;
  }

}

module.exports = FanDeviceFactory;
