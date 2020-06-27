const miio = require('miio');
const ping = require('ping');
const fs = require('fs');
const mkdirp = require('mkdirp');

let Service;
let Characteristic;


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-xiaomi-fan', 'xiaomifan', xiaomiFanAccessory);
};

// --== MAIN CLASS ==--
class xiaomiFanAccessory {
  constructor(log, config, api) {
    this.log = log;

    // configuration
    this.name = config['name'];
    this.ip = config['ip'];
    this.token = config['token'];
    this.alivePollingInterval = config['pollingInterval'] || 5;
    this.alivePollingInterval = this.alivePollingInterval * 1000;
    this.prefsDir = config['prefsDir'] || api.user.storagePath() + '/.xiaomiFan/';
    this.moveControl = config['moveControl'];
    if (this.moveControl == undefined) {
      this.moveControl = true;
    }
    this.buzzerControl = config['buzzerControl'];
    if (this.buzzerControl == undefined) {
      this.buzzerControl = true;
    }
    this.ledControl = config['ledControl'];
    if (this.ledControl == undefined) {
      this.ledControl = true;
    }

    if (!this.ip) {
      this.log.error("[ERROR]'ip' not defined! Please check your 'config.json' file.");
    }

    if (!this.token) {
      this.log.error("[ERROR]'token' not defined! Please check your 'config.json' file.");
    }

    // check if prefs directory ends with a /, if not then add it
    if (this.prefsDir.endsWith('/') === false) {
      this.prefsDir = this.prefsDir + '/';
    }

    // check if the tv preferences directory exists, if not then create it
    if (fs.existsSync(this.prefsDir) === false) {
      mkdirp(this.prefsDir);
    }

    this.fanModelInfo = this.prefsDir + 'info_' + this.ip.split('.').join('') + '_' + this.token;

    // prepare variables
    this.fanDevice = undefined;
    this.enabledServices = [];
    this.checkFanStatusInterval = null;

    //fan status
    this.isFanOn = false;
    this.fanRotationSpeed = 0;
    this.isChildLockActive = false;
    this.isSwingModeActive = false;
    this.isNaturalModeEnabled = false;
    this.isBuzzerEnabled = false;
    this.isLedEnabled = true;

    //prepare the services
    this.preapreFanServices();

    //try to initially connect to the device
    //  this.connectToFan(this.updateFanStatus.bind(this)); // do not need to do that, the checkFanStatus does this.

    // USE miio.discover instead OF PING?
    // start the polling
    if (!this.checkFanStatusInterval) {
      this.checkFanStatusInterval = setInterval(this.checkFanState.bind(this, this.updateFanStatus.bind(this)), this.alivePollingInterval);
    }
  }


  // --== SETUP SERVICES  ==--
  preapreFanServices() {
    // info service

    // currently i save the fan model info in a file and load if it exists
    let modelName = this.name;
    try {
      modelName = fs.readFileSync(this.fanModelInfo);
    } catch (err) {
      this.log.debug('Xiaomi Fan - fan model info file does not exist');
    }

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, modelName)
      .setCharacteristic(Characteristic.SerialNumber, this.ip)
      .setCharacteristic(Characteristic.FirmwareRevision, '0.9.4');

    this.enabledServices.push(this.informationService);

    // fan service
    this.fanService = new Service.Fanv2(this.name, 'fanService');
    this.fanService
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.LockPhysicalControls)
      .on('get', this.getLockPhysicalControls.bind(this))
      .on('set', this.setLockPhysicalControls.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.SwingMode)
      .on('get', this.getSwingMode.bind(this))
      .on('set', this.setSwingMode.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.RotationDirection) // used to switch between natural and normal mode
      .on('get', this.getRotationDirection.bind(this))
      .on('set', this.setRotationDirection.bind(this));

    this.enabledServices.push(this.fanService);


    // add move left/right buttons
    if (this.moveControl) {
      this.moveLeftService = new Service.Switch(this.name + ' Move left', 'moveLeftService');
      this.moveLeftService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMoveFanSwitch.bind(this))
        .on('set', (state, callback) => {
          this.setMoveFanSwitch(state, callback, 'left');
        });

      this.enabledServices.push(this.moveLeftService);

      this.moveRightService = new Service.Switch(this.name + ' Move right', 'moveRightService');
      this.moveRightService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMoveFanSwitch.bind(this))
        .on('set', (state, callback) => {
          this.setMoveFanSwitch(state, callback, 'right');
        });

      this.enabledServices.push(this.moveRightService);
    }


    // add buzzer button
    if (this.buzzerControl) {
      this.buzzerService = new Service.Switch(this.name + ' Buzzer', 'buzzerService');
      this.buzzerService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getBuzzer.bind(this))
        .on('set', this.setBuzzer.bind(this));

      this.enabledServices.push(this.buzzerService);
    }


    // add led button
    if (this.ledControl) {
      this.ledService = new Service.Switch(this.name + ' LED', 'ledService');
      this.ledService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getLed.bind(this))
        .on('set', this.setLed.bind(this));

      this.enabledServices.push(this.ledService);
    }
  }


  // --== HELPER METHODS ==--
  connectToFan(callback) {
    miio.device({
      address: this.ip,
      token: this.token
    }).then(device => {
      this.log.info('Xiaomi Fan - connected to Fan');
      this.log.info(device);
      this.fanDevice = device;

      // save model name
      if (fs.existsSync(this.fanModelInfo) === false) {
        fs.writeFile(this.fanModelInfo, device.miioModel, (err) => {
          if (err) {
            this.log.debug('Xiaomi Fan - error occured could not write fan model info %s', err);
          } else {
            this.log.debug('Xiaomi Fan - fan model info successfully saved!');
          }
        });
      } else {
        this.log.debug('Xiaomi Fan - fan model info file already exists, not saving!');
      }

      // get dmaker fan debug info
      if (this.isDmakerFan()) {
        this.log.debug('Xiaomi Fan - dmaker fan detected!');
      }

      callback(true);
      // WIP, try to find a way to make the events work, to get values from the fan only when something changes and also enable home automation
      /*
            device.defineProperty('power');
            device.defineProperty('speed');
            device.loadProperties(['power', 'speed']);
            device.onAny(power => console.log('Power changed to ', power));
            device.on('powerChanged', isOn => console.log('TEST EVENT ', isOn));
            device.on('power', isOn => console.log('TEST EVENT ', isOn));
            device.loadProperties(['power', 'speed']);
			*/
    }).catch(err => {
      console.log('Error ', err);
      this.fanDevice = undefined;
    });
  }

  checkFanState(callback) {
    ping.sys.probe(this.ip, (isAlive) => {
      if (!isAlive && this.fanDevice) {
        this.log.info('Xiaomi Fan - lost connection to fan. Disconnecting...');
        this.fanDevice.destroy();
        this.fanDevice = undefined;
        callback(false);
      } else if (isAlive && !this.fanDevice) {
        this.log.info('Xiaomi Fan - found Fan in network. Trying to connect...');
        this.connectToFan(callback);
      }
      if (isAlive === false) {
        this.log.debug('Xiaomi Fan - Fan not found');
      }
    });
  }

  isDmakerFan() {
    if (this.fanDevice) {
      let fanModel = this.fanDevice.miioModel;
      if (fanModel && fanModel.includes('dmaker')) {
        return true;
      }
      return false;
    }

    return false;
  }

  updateFanStatus(isFanConnected) {
    if (this.fanService) this.fanService.getCharacteristic(Characteristic.Active).updateValue(isFanConnected ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
  }


  // --== FAN CONTROL METHODS ==--

  // power
  getFanPowerStatus() {
    if (this.fanDevice && this.fanService) {
      let onValue = 'on';
      let props = ['power'];

      if (this.isDmakerFan() === true) {
        onValue = true;
        props = ['all'];
      }

      this.fanDevice.call('get_prop', props).then(result => {
        this.log.debug('Xiaomi Fan - got power state from fan: %s', result[0]);
        this.isFanOn = result[0] === onValue;
        this.updateFanStatus(this.isFanOn);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting power state: %s', err);
      });
    }
  }

  setFanPowerStatus(state) {
    if (this.fanDevice) {
      this.isFanOn = state === Characteristic.Active.ACTIVE;

      let powerState = this.isFanOn ? 'on' : 'off';
      let setMethod = 'set_power';

      if (this.isDmakerFan() === true) {
        powerState = this.isFanOn ? 'true' : 'false';
        setMethod = 's_power';
      }

      this.fanDevice.call(setMethod, [powerState]).then(result => {
        this.log.debug('Xiaomi Fan - successfully set power state to: %s. Result: %s', powerState, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while setting power state to: %s. Error: %s', powerState, err);
      });
    }
  }

  // rotation speed
  getFanRotationSpeed() {
    if (this.fanDevice && this.fanService) {
      let props = ['natural_level', 'speed_level'];
      let result1Index = 0; // natural level
      let result2Index = 1; // normal speed level

      if (this.isDmakerFan() === true) {
        props = ['speed'];
        result1Index = 0; // normal speed level
        result2Index = 0; // normal speed level
      }

      this.fanDevice.call('get_prop', props).then(result => {
        if (result[result1Index] > 0) {
          this.log.debug('Xiaomi Fan - got speed level from fan: %s. Mode: natural', result[result1Index]);
          this.fanRotationSpeed = result[result1Index];
        } else {
          this.log.debug('Xiaomi Fan - got speed level from fan: %s. Mode: standard', result[result2Index]);
          this.fanRotationSpeed = result[result2Index];
        }
        if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.fanRotationSpeed);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting speed level: %s', err);
      });
    }
  }

  setFanRotationSpeed(value) {
    if (this.fanDevice) {
      this.fanRotationSpeed = value;

      if (value > 0) {
        let setMethod = "set_speed_level";
        if (this.isNaturalModeEnabled === true) {
          setMethod = "set_natural_level";
        }

        if (this.isDmakerFan() === true) {
          setMethod = 's_speed';
        }

        this.fanDevice.call(setMethod, [value]).then(result => {
          if (result[0] === "ok") {
            this.log.debug('Xiaomi Fan - successfully set speed level to: %d. Result: %s', value, result);
          } else {
            this.log.debug('Xiaomi Fan - error while setting speed level to: %d. Result: %s', value, result);
          }
        }).catch(err => {
          this.log.debug('Xiaomi Fan - error while setting speed level to: %d. Error: %s', value, err);
        });
      }
    }
  }

  // child lock
  getFanChildLockState() {
    if (this.fanDevice && this.fanService) {
      let onValue = 'on';
      let props = ['child_lock'];

      if (this.isDmakerFan() === true) {
        onValue = true;
        props = ['child_lock'];
      }

      this.fanDevice.call('get_prop', props).then(result => {
        this.log.debug('Xiaomi Fan - got child lock state from fan: %s', result[0]);
        this.isChildLockActive = result[0] === onValue;
        if (this.fanService) this.fanService.getCharacteristic(Characteristic.LockPhysicalControls).updateValue(this.isChildLockActive ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting child lock state: %s', err);
      });
    }
  }

  setFanChildLockState(state) {
    if (this.fanDevice) {
      this.isChildLockActive = state === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED;

      let childLockState = this.isChildLockActive ? 'on' : 'off';
      let setMethod = 'set_child_lock';

      if (this.isDmakerFan() === true) {
        childLockState = this.isChildLockActive ? 'true' : 'false';
        setMethod = 's_lock';
      }

      this.fanDevice.call(setMethod, [childLockState]).then(result => {
        this.log.debug('Xiaomi Fan - successfully set child lock state to: %s. Result: %s', childLockState, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while setting child lock state to: %s. Error: %s', childLockState, err);
      });
    }
  }

  // swing mode
  getFanSwingModeState() {
    if (this.fanDevice && this.fanService) {
      let onValue = 'on';
      let props = ['angle_enable'];

      if (this.isDmakerFan() === true) {
        onValue = true;
        props = ['roll_enable'];
      }

      this.fanDevice.call('get_prop', props).then(result => {
        this.log.debug('Xiaomi Fan - got swing mode state from fan: %s', result[0]);
        this.isSwingModeActive = result[0] === onValue;
        if (this.fanService) this.fanService.getCharacteristic(Characteristic.SwingMode).updateValue(this.isSwingModeActive ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting swing mode state: %s', err);
      });
    }
  }

  setFanSwingModeState(state) {
    if (this.fanDevice) {
      this.isSwingModeActive = state === Characteristic.SwingMode.SWING_ENABLED;

      let swingModeState = this.isSwingModeActive ? 'on' : 'off';
      let setMethod = 'set_angle_enable';

      if (this.isDmakerFan() === true) {
        swingModeState = this.isSwingModeActive ? 'true' : 'false';
        setMethod = 's_roll';
      }

      this.fanDevice.call(setMethod, [swingModeState]).then(result => {
        this.log.debug('Xiaomi Fan - successfully set swing mode state to: %s. Result: %s', swingModeState, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while setting swing mode state to: %s. Error: %s', swingModeState, err);
      });
    }
  }

  // natural mode state
  getFanNaturalModeState() {
    if (this.fanDevice && this.fanService) {
      let props = ['natural_level'];
      let callback = result => {
        if (result[0] > 0) {
          this.log.debug('Xiaomi Fan - got mode from fan: natural, result: %s', result);
          this.isNaturalModeEnabled = true;
        } else {
          this.log.debug('Xiaomi Fan - got mode from fan: standard, result: %s', result);
          this.isNaturalModeEnabled = false;
        }
        if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(this.isNaturalModeEnabled ? Characteristic.SwingMode.COUNTER_CLOCKWISE : Characteristic.SwingMode.CLOCKWISE);
      }

      if (this.isDmakerFan() === true) {
        props = ['mode'];
        callback = result => {
          if (result[0] === 'normal') {
            this.log.debug('Xiaomi Fan - got mode from fan: standard, result: %s', result);
            this.isNaturalModeEnabled = false;
          } else {
            this.log.debug('Xiaomi Fan - got mode from fan: natural, result: %s', result);
            this.isNaturalModeEnabled = true;
          }
          if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(this.isNaturalModeEnabled ? Characteristic.SwingMode.COUNTER_CLOCKWISE : Characteristic.SwingMode.CLOCKWISE);
        }
      }



      this.fanDevice.call('get_prop', props).then(callback).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting mode: %s', err);
      });

    }
  }

  setFanNaturalModeState(state) {
    if (this.fanDevice) {
      this.isNaturalModeEnabled = state === Characteristic.RotationDirection.COUNTER_CLOCKWISE;

      let mode = this.isNaturalModeEnabled ? 'natural' : 'standard';

      let valueState = this.fanRotationSpeed;
      let setMethod = this.isNaturalModeEnabled ? 'set_natural_level' : 'set_speed_level';

      if (this.isDmakerFan() === true) {
        valueState = this.isNaturalModeEnabled ? 'nature' : 'normal';
        setMethod = 's_mode';
      }

      this.fanDevice.call(setMethod, [valueState]).then(result => {
        this.log.debug('Xiaomi Fan - successfully set mode to: %s. Current rotation speed: %d. Result: %s', mode, this.fanRotationSpeed, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while setting mode to: %s. Current rotation speed: %d. Error: %s', mode, this.fanRotationSpeed, err);
      });

    }
  }

  // move fan
  moveFan(state, direction) {
    if (this.fanDevice) {
      this.log.debug('Xiaomi Fan - fan move service - direction: %s', direction);

      let setMethod = 'set_move';

      if (this.isDmakerFan() === true) {
        setMethod = 'm_roll';
      }

      this.fanDevice.call(setMethod, [direction]).then(result => {
        this.log.debug('Xiaomi Fan - fan move service - successfully moved fan to %s. Result: %s', direction, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - fan move service - error moving fan to: %s. Error: %s', direction, err);
      });
    }
  }

  // buzzer state
  getFanBuzzerState() {
    if (this.fanDevice && this.buzzerService) {
      let props = ['buzzer'];
      let callback = result => {
        this.log.debug('Xiaomi Fan - got buzzer state from fan: %s', result[0]);
        if (result[0] > 0) {
          this.isBuzzerEnabled = true;
        } else {
          this.isBuzzerEnabled = false;
        }
        if (this.buzzerService) this.buzzerService.getCharacteristic(Characteristic.On).updateValue(this.isBuzzerEnabled);
      }

      if (this.isDmakerFan() === true) {
        props = ['beep_sound'];
        callback = result => {
          this.log.debug('Xiaomi Fan - got buzzer state from fan: %s', result[0]);
          if (result[0] === true) {
            this.isBuzzerEnabled = true;
          } else {
            this.isBuzzerEnabled = false;
          }
          if (this.buzzerService) this.buzzerService.getCharacteristic(Characteristic.On).updateValue(this.isBuzzerEnabled);
        }
      }

      this.fanDevice.call('get_prop', props).then(callback).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting buzzer state: %s', err);
      });
    }
  }

  setFanBuzzerState(state) {
    if (this.fanDevice) {
      this.isBuzzerEnabled = state;

      var buzzerVal = state === true ? 2 : 0;
      let setMethod = 'set_buzzer';

      if (this.isDmakerFan() === true) {
        buzzerVal = state === true ? 'true' : 'false';
        setMethod = 's_sound';
      }

      this.fanDevice.call(setMethod, [buzzerVal]).then(result => {
        this.log.debug('Xiaomi Fan - successfully set buzzer state to: %s. Result: %s', state, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while setting buzzer state to: %s. Error: %s', state, err);
      });
    }
  }

  // LED state
  getFanLedState() {
    if (this.fanDevice && this.ledService) {
      let props = ['led_b'];
      let callback = result => {
        this.log.debug('Xiaomi Fan - got led state from fan: %s', result[0]);
        if (result[0] === 0 || result[0] === 1) {
          this.isLedEnabled = true;
        } else {
          this.isLedEnabled = false;
        }
        if (this.ledService) this.ledService.getCharacteristic(Characteristic.On).updateValue(this.isLedEnabled);
      }

      if (this.isDmakerFan() === true) {
        props = ['light'];
        callback = result => {
          this.log.debug('Xiaomi Fan - got led state from fan: %s', result[0]);
          if (result[0] === true) {
            this.isLedEnabled = true;
          } else {
            this.isLedEnabled = false;
          }
          if (this.ledService) this.ledService.getCharacteristic(Characteristic.On).updateValue(this.isLedEnabled);
        }
      }

      this.fanDevice.call('get_prop', props).then(callback).catch(err => {
        this.log.debug('Xiaomi Fan - error while requesting led state: %s', err);
      });
    }
  }

  setFanLedState(state) {
    if (this.fanDevice) {
      this.isLedEnabled = state;

      var ledBrightness = state === true ? 0 : 2;
      let setMethod = 'set_led_b';

      if (this.isDmakerFan() === true) {
        ledBrightness = state === true ? 'true' : 'false';
        setMethod = 's_light';
      }

      this.fanDevice.call(setMethod, [ledBrightness]).then(result => {
        this.log.debug('Xiaomi Fan - successfully set led state to: %s. Result: %s', state, result);
      }).catch(err => {
        this.log.debug('Xiaomi Fan - error while setting led state to: %s. Error: %s', state, err);
      });
    }
  }

  // --== HOMEBRIDGE STATE SETTERS/GETTERS ==--
  getPowerState(callback) {
    if (this.fanDevice) {
      this.getFanPowerStatus();
    }
    callback(null, this.isFanOn ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
  }

  setPowerState(state, callback) {
    if (this.fanDevice) {
      this.setFanPowerStatus(state);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set power state`));
    }
  }

  getRotationSpeed(callback) {
    if (this.fanDevice) {
      this.getFanRotationSpeed();
    }
    callback(null, this.fanRotationSpeed);
  }

  setRotationSpeed(value, callback) {
    if (this.fanDevice) {
      this.setFanRotationSpeed(value);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set rotation speed`));
    }
  }

  getLockPhysicalControls(callback) {
    if (this.fanDevice) {
      this.getFanChildLockState();
    }
    callback(null, this.isChildLockActive ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
  }

  setLockPhysicalControls(state, callback) {
    if (this.fanDevice) {
      this.setFanChildLockState(state);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set child lock state`));
    }
  }

  getSwingMode(callback) {
    if (this.fanDevice) {
      this.getFanSwingModeState();
    }
    callback(null, this.isSwingModeActive ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
  }

  setSwingMode(state, callback) {
    if (this.fanDevice) {
      this.setFanSwingModeState(state);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set swing mode state`));
    }
  }

  getRotationDirection(callback) {
    if (this.fanDevice) {
      this.getFanNaturalModeState();
    }
    callback(null, this.isNaturalModeEnabled ? Characteristic.SwingMode.COUNTER_CLOCKWISE : Characteristic.SwingMode.CLOCKWISE);
  }

  setRotationDirection(state, callback) {
    if (this.fanDevice) {
      this.setFanNaturalModeState(state);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set natural mode state`));
    }
  }

  getMoveFanSwitch(callback) {
    callback(null, false);
  }

  setMoveFanSwitch(state, callback, direction) {
    if (this.fanDevice) {
      this.moveFan(state, direction);
      setTimeout(() => {
        if (this.moveLeftService) this.moveLeftService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.moveRightService) this.moveRightService.getCharacteristic(Characteristic.On).updateValue(false);
      }, 10);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot move fan`));
    }
  }

  getBuzzer(callback) {
    if (this.fanDevice) {
      this.getFanBuzzerState();
    }
    callback(null, this.isBuzzerEnabled);
  }

  setBuzzer(state, callback) {
    if (this.fanDevice) {
      this.setFanBuzzerState(state);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set buzzer state`));
    }
  }

  getLed(callback) {
    if (this.fanDevice) {
      this.getFanLedState();
    }
    callback(null, this.isLedEnabled);
  }

  setLed(state, callback) {
    var ledBrighntess = state === true ? 0 : 2;
    if (this.fanDevice) {
      this.setFanLedState(state);
      callback();
    } else {
      callback(new Error(`[${this.name}] Fan is not connected, cannot set LED state`));
    }
  }

  getServices() {
    return this.enabledServices;
  }
}
