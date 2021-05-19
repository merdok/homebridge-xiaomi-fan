const ZhimiFanFa1 = require('./zhimi.fan.fa1.js');
const FanCapabilities = require('../../FanCapabilities.js');

class ZhimiFanFb1 extends ZhimiFanFa1 {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }

  // zhimi.fan.fb1
  // http://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:fan:0000A005:zhimi-fb1:1

  // seems pretty much the same as fa1 so jus inherit from that device

  /*----------========== INIT ==========----------*/


  /*----------========== SETUP ==========----------*/


  /*----------========== STATUS ==========----------*/


  /*----------========== COMMANDS ==========----------*/


}

module.exports = ZhimiFanFb1;
