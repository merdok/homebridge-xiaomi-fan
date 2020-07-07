const miio = require('miio');
const fs = require('fs');
const mkdirp = require('mkdirp');
const BaseFan = require('./devices/baseFan.js');
const SmartmiFan = require('./devices/smartmiFan.js');
const DmakerFan = require('./devices/dmakerFan.js');

let Service;
let Characteristic;

const PLUGIN_NAME = 'homebridge-xiaomi-fan';
const ACCESSORY_NAME = 'xiaomifan';
const PLUGIN_VERSION = '1.0.2';

const FAN_MODE_STANDARD = 'standard';
const FAN_MODE_NATURAL = 'natural';


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, xiaomiFanAccessory);
};

class xiaomiFanAccessory {
  constructor(log, config, api) {
    this.log = log;

    // configuration
    this.name = config['name'];
    this.ip = config['ip'];
    this.token = config['token'];
    this.pollingInterval = config['pollingInterval'] || 5;
    this.pollingInterval = this.pollingInterval * 1000;
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
    this.modeButtons = config['modeButtons'];
    if (this.modeButtons == undefined) {
      this.modeButtons = false;
    }
    this.shutdownTimer = config['shutdownTimer'];
    if (this.shutdownTimer == undefined) {
      this.shutdownTimer = false;
    }
    this.angleButtons = config['angleButtons'];

    if (!this.ip) {
      this.logError(`'ip' is required but not defined! Please check your 'config.json' file.`);
      return;
    }

    if (!this.token) {
      this.logError(`'token' is required but not defined! Please check your 'config.json' file.`);
      return;
    }

    // check if prefs directory ends with a /, if not then add it
    if (this.prefsDir.endsWith('/') === false) {
      this.prefsDir = this.prefsDir + '/';
    }

    // check if the fan preferences directory exists, if not then create it
    if (fs.existsSync(this.prefsDir) === false) {
      mkdirp(this.prefsDir);
    }

    // create fan model info file
    this.fanModelInfoFile = this.prefsDir + 'info_' + this.ip.split('.').join('') + '_' + this.token;

    // prepare variables
    this.fanDevice = undefined;
    this.enabledServices = [];

    //prepare the services
    this.preapreFanServices();

    //start the fan discovery
    this.connectToFan();
  }


  /*----------========== SETUP ==========----------*/

  connectToFan() {
    let checkDelayTime = this.pollingInterval * 6; // 6 times alive polling interval
    miio.device({
      address: this.ip,
      token: this.token
    }).then(device => {
      this.logInfo(`Found Fan ${device.miioModel}`);
      this.logObj(device);
      this.setupDevice(device);
    }).catch(err => {
      this.logDebug(`Fan not found! Retrying in ${checkDelayTime/1000} seconds!`);
      setTimeout(() => {
        this.connectToFan();
      }, checkDelayTime);
    });
  }

  setupDevice(miioDevice) {
    let fanModel = miioDevice.miioModel;
    if (fanModel && fanModel.includes('dmaker')) {
      // do dmaker stuff
      this.logDebug(`Creating DmakerFan device!`);
      this.fanDevice = new DmakerFan(miioDevice, this.ip, this.token, this.name, this.pollingInterval, this.log);
    } else {
      // do smartmi stuff
      this.logDebug(`Creating SmartmiFan device!`);
      this.fanDevice = new SmartmiFan(miioDevice, this.ip, this.token, this.name, this.pollingInterval, this.log);
    }

    // register for the fan update properties event
    if (this.fanDevice) {
      this.fanDevice.on('fanPropertiesUpdated', () => {
        this.updateFanStatus();
      });
    }

    // save model name
    if (fs.existsSync(this.fanModelInfoFile) === false) {
      fs.writeFile(this.fanModelInfoFile, fanModel, (err) => {
        if (err) {
          this.logDebug('Error occured could not write fan model info %s', err);
        } else {
          this.logDebug('Fan model info successfully saved!');
        }
      });
    } else {
      this.logDebug('Fan model info file already exists, not saving!');
    }

  }


  /*----------========== SETUP SERVICES ==========----------*/
  preapreFanServices() {
    // info service

    // currently i save the fan model info in a file and load if it exists
    let modelName = this.name;
    try {
      modelName = fs.readFileSync(this.fanModelInfoFile);
    } catch (err) {
      this.log.debug('Xiaomi Fan - fan model info file does not exist');
    }

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Name, this.name)
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, modelName)
      .setCharacteristic(Characteristic.SerialNumber, this.ip)
      .setCharacteristic(Characteristic.FirmwareRevision, PLUGIN_VERSION);


    this.enabledServices.push(this.informationService);

    // fan service
    this.fanService = new Service.Fanv2(this.name, 'fanService');
    this.fanService
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.CurrentFanState) // for what is this used?
      .on('get', this.getFanState.bind(this));
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

    // add mode buttons
    if (this.modeButtons) {
      this.standardModeService = new Service.Switch(this.name + ' Standard mode', 'standardModeService');
      this.standardModeService
        .getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.getMode(callback, FAN_MODE_STANDARD);
        })
        .on('set', (state, callback) => {
          this.setMode(state, callback, FAN_MODE_STANDARD);
        });

      this.enabledServices.push(this.standardModeService);

      this.naturalModeService = new Service.Switch(this.name + ' Natural mode', 'naturalModeService');
      this.naturalModeService
        .getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.getMode(callback, FAN_MODE_NATURAL);
        })
        .on('set', (state, callback) => {
          this.setMode(state, callback, FAN_MODE_NATURAL);
        });

      this.enabledServices.push(this.naturalModeService);
    }

    // add shutdown timer slider
    if (this.shutdownTimer) {
      this.shutdownTimerService = new Service.Lightbulb(this.name + ' Shutdown timer', 'shutdownTimerService');
      this.shutdownTimerService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getShutdownTimerEnabled.bind(this))
        .on('set', this.setShutdownTimerEnabled.bind(this));
      this.shutdownTimerService
        .addCharacteristic(new Characteristic.Brightness())
        .on('get', this.getShutdownTimer.bind(this))
        .on('set', this.setShutdownTimer.bind(this));

      this.enabledServices.push(this.shutdownTimerService);
    }

    //add angle angleButtons
    this.prepareAngleButtonsService();

  }

  prepareAngleButtonsService() {
    if (this.angleButtons === undefined || this.angleButtons === null || this.angleButtons.length <= 0) {
      return;
    }

    if (Array.isArray(this.angleButtons) === false) {
      this.logWarn('The angle buttons service needs to be defined as an array! Please correct your config.json if you want to use the service.');
      return;
    }

    this.angleButtonsService = new Array();
    this.angleButtons.forEach((value, i) => {
      let parsedValue = parseInt(value);
      this.angleButtons[i] = parsedValue;
      let tmpAngleButton = new Service.Switch(this.name + ' Angle - ' + parsedValue, 'angleButtonService' + i);
      tmpAngleButton
        .getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.getAngleButtonState(callback, parsedValue);
        })
        .on('set', (state, callback) => {
          this.setAngleButtonState(state, callback, parsedValue);
        });

      this.enabledServices.push(tmpAngleButton);
      this.angleButtonsService.push(tmpAngleButton);
    });
  }


  /*----------========== HOMEBRIDGE STATE SETTERS/GETTERS ==========----------*/

  getPowerState(callback) {
    let isFanOn = false;
    if (this.fanDevice) {
      isFanOn = this.fanDevice.isPowerOn();
    }
    callback(null, isFanOn ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
  }

  setPowerState(state, callback) {
    if (this.fanDevice) {
      let isPowerOn = state === Characteristic.Active.ACTIVE;
      this.fanDevice.setPowerOn(isPowerOn);
      callback();
    } else {
      callback(this.createError(`cannot set power state`));
    }
  }

  getFanState(callback) {
    let fanState = Characteristic.CurrentFanState.INACTIVE;
    if (this.fanDevice) {
      fanState = this.fanDevice.isPowerOn() ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE
    }
    callback(null, fanState);
  }

  getRotationSpeed(callback) {
    let fanRotationSpeed = 0;
    if (this.fanDevice) {
      fanRotationSpeed = this.fanDevice.getRotationSpeed();
    }
    callback(null, fanRotationSpeed);
  }

  setRotationSpeed(value, callback) {
    if (this.fanDevice) {
      this.fanDevice.setRotationSpeed(value);
      callback();
    } else {
      callback(this.createError(`cannot set rotation speed`));
    }
  }

  getLockPhysicalControls(callback) {
    let isChildLockActive = false;
    if (this.fanDevice) {
      isChildLockActive = this.fanDevice.isChildLockActive();
    }
    callback(null, isChildLockActive ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
  }

  setLockPhysicalControls(state, callback) {
    if (this.fanDevice) {
      let isChildLockActive = state === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED;
      this.fanDevice.setChildLock(isChildLockActive);
      callback();
    } else {
      callback(this.createError(`cannot set child lock state`));
    }
  }

  getSwingMode(callback) {
    let isSwingModeActive = false;
    if (this.fanDevice) {
      isSwingModeActive = this.fanDevice.isSwingModeEnabled();
    }
    callback(null, isSwingModeActive ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
  }

  setSwingMode(state, callback) {
    if (this.fanDevice) {
      let isSwingModeActive = state === Characteristic.SwingMode.SWING_ENABLED;
      this.fanDevice.setSwingModeEnabled(isSwingModeActive);
      callback();
    } else {
      callback(this.createError(`cannot set swing mode state`));
    }
  }

  getRotationDirection(callback) {
    let isNaturalModeEnabled = false;
    if (this.fanDevice) {
      isNaturalModeEnabled = this.fanDevice.isNaturalModeEnabled();
    }
    callback(null, isNaturalModeEnabled ? Characteristic.SwingMode.COUNTER_CLOCKWISE : Characteristic.SwingMode.CLOCKWISE);
  }

  setRotationDirection(state, callback) {
    if (this.fanDevice) {
      let isNaturalModeEnabled = state === Characteristic.RotationDirection.COUNTER_CLOCKWISE;
      let mode = isNaturalModeEnabled ? FAN_MODE_NATURAL : FAN_MODE_STANDARD;
      this.setMode(true, callback, mode); // use the setMode method here to instantly update the switches
    } else {
      callback(this.createError(`cannot set natural mode state`));
    }
  }

  getMoveFanSwitch(callback) {
    callback(null, false);
  }

  setMoveFanSwitch(state, callback, direction) {
    if (this.fanDevice) {
      if (direction === 'left') {
        this.fanDevice.moveLeft();
      } else {
        this.fanDevice.moveRight();
      }
      setTimeout(() => {
        if (this.moveLeftService) this.moveLeftService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.moveRightService) this.moveRightService.getCharacteristic(Characteristic.On).updateValue(false);
      }, 15);
      callback();
    } else {
      callback(this.createError(`cannot move fan`));
    }
  }

  getBuzzer(callback) {
    let isBuzzerEnabled = false;
    if (this.fanDevice) {
      isBuzzerEnabled = this.fanDevice.isBuzzerEnabled();
    }
    callback(null, isBuzzerEnabled);
  }

  setBuzzer(state, callback) {
    if (this.fanDevice) {
      this.fanDevice.setBuzzerEnabled(state);
      callback();
    } else {
      callback(this.createError(`cannot set buzzer state`));
    }
  }

  getLed(callback) {
    let isLedEnabled = false;
    if (this.fanDevice) {
      isLedEnabled = this.fanDevice.isLedEnabled();
    }
    callback(null, isLedEnabled);
  }

  setLed(state, callback) {
    if (this.fanDevice) {
      this.fanDevice.setLedEnabled(state);
      callback();
    } else {
      callback(this.createError(`cannot set LED state`));
    }
  }

  getMode(callback, mode) {
    if (this.fanDevice) {
      if (mode === FAN_MODE_STANDARD && this.fanDevice.isNaturalModeEnabled() === false) {
        callback(null, true);
        return;
      }

      if (mode === FAN_MODE_NATURAL && this.fanDevice.isNaturalModeEnabled() === true) {
        callback(null, true);
        return;
      }
    }
    callback(null, false);
  }

  setMode(state, callback, mode) {
    if (this.fanDevice) {
      if (state) {
        if (mode === FAN_MODE_STANDARD) {
          if (this.fanDevice.isNaturalModeEnabled() === true) {
            this.fanDevice.setNaturalModeEnabled(false);
          }
        } else {
          if (this.fanDevice.isNaturalModeEnabled() === false) {
            this.fanDevice.setNaturalModeEnabled(true);
          }
        }
        this.updateModeButtonsAndRotationDirection(mode);
      } else {
        setTimeout(() => {
          this.updateModeButtonsAndRotationDirection(null);
        }, 15);
      }
      callback();
    } else {
      callback(this.createError(`cannot set mode state`));
    }
  }

  getShutdownTimerEnabled(callback) {
    let isShutdownTimerEnabled = false;
    if (this.fanDevice) {
      isShutdownTimerEnabled = this.fanDevice.isShutdownTimerEnabled();
    }
    callback(null, isShutdownTimerEnabled);
  }

  setShutdownTimerEnabled(state, callback) {
    if (this.fanDevice) {
      if (state === false) { // only if disabling, enabling will automatically set it to 100%
        this.fanDevice.setShutdownTimer(0);
      }
      callback();
    } else {
      callback(this.createError(`cannot set shutdown timer state`));
    }
  }

  getShutdownTimer(callback) {
    let shutdownTimerTime = 0;
    if (this.fanDevice) {
      shutdownTimerTime = this.fanDevice.getShutdownTimer();
    }
    callback(null, shutdownTimerTime);
  }

  setShutdownTimer(level, callback) {
    if (this.fanDevice) {
      this.fanDevice.setShutdownTimer(level);
      callback();
    } else {
      callback(this.createError(`cannot set shutdown timer time`));
    }
  }

  getAngleButtonState(callback, angle) {
    let angleButtonEnabled = false;
    if (this.fanDevice) {
      angleButtonEnabled = this.fanDevice.getAngle() === angle;
    }
    callback(null, angleButtonEnabled);
  }

  setAngleButtonState(state, callback, angle) {
    if (this.fanDevice) {
      if (state) {
        this.fanDevice.setAngle(angle);
        this.updateAngleButtons(angle);
      } else {
        setTimeout(() => {
          this.updateAngleButtons(null);
        }, 15);
      }
      callback();
    } else {
      callback(this.createError(`cannot set swing angle`));
    }
  }


  /*----------========== HELPERS ==========----------*/

  updateFanStatus(isFanConnected) {
    if (this.fanDevice) {
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.Active).updateValue(this.fanDevice.isPowerOn() ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.fanDevice.getRotationSpeed());
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.LockPhysicalControls).updateValue(this.fanDevice.isChildLockActive() ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.SwingMode).updateValue(this.fanDevice.isSwingModeEnabled() ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
      if (this.buzzerService) this.buzzerService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isBuzzerEnabled());
      if (this.ledService) this.ledService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isLedEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isShutdownTimerEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.Brightness).updateValue(this.fanDevice.getShutdownTimer());
      this.updateModeButtonsAndRotationDirection(null);
      this.updateAngleButtons(null);
    }
  }

  updateModeButtonsAndRotationDirection(mode) {
    if (mode === null || mode === undefined) {
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(this.fanDevice.isNaturalModeEnabled() ? Characteristic.SwingMode.COUNTER_CLOCKWISE : Characteristic.SwingMode.CLOCKWISE);
      if (this.standardModeService) this.standardModeService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isNaturalModeEnabled() === false);
      if (this.naturalModeService) this.naturalModeService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isNaturalModeEnabled());
    } else {
      if (mode === FAN_MODE_STANDARD) {
        if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(Characteristic.SwingMode.CLOCKWISE);
        if (this.standardModeService) this.standardModeService.getCharacteristic(Characteristic.On).updateValue(true);
        if (this.naturalModeService) this.naturalModeService.getCharacteristic(Characteristic.On).updateValue(false);
      }
      if (mode === FAN_MODE_NATURAL) {
        if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(Characteristic.SwingMode.COUNTER_CLOCKWISE);
        if (this.standardModeService) this.standardModeService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.naturalModeService) this.naturalModeService.getCharacteristic(Characteristic.On).updateValue(true);
      }
    }
  }

  updateAngleButtons(activeAngle) {
    if (this.angleButtonsService) {
      if (activeAngle === undefined || activeAngle === null) {
        activeAngle = this.fanDevice.getAngle();
      }

      this.angleButtonsService.forEach((tmpAngleButton, i) => {
        if (activeAngle === this.angleButtons[i]) {
          tmpAngleButton.getCharacteristic(Characteristic.On).updateValue(true);
        } else {
          tmpAngleButton.getCharacteristic(Characteristic.On).updateValue(false);
        }
      });
    }
  }

  createError(msg) {
    return new Error(`[${this.name}] Fan is not connected, ` + msg);
  }


  /*----------========== LOG ==========----------*/

  logInfo(message, ...args) {
    this.log.info(`[${this.name}] ` + message, ...args);
  }

  logWarn(message, ...args) {
    this.log.warn(`[${this.name}] ` + message, ...args);
  }

  logDebug(message, ...args) {
    this.log.debug(`[${this.name}] ` + message, ...args);
  }

  logError(message, ...args) {
    this.log.error(`[${this.name}] [ERROR] ` + message, ...args);
  }

  logObj(obj) {
    this.log.info(obj);
  }


  /*----------========== ACCESSORY SERVICES ==========----------*/

  getServices() {
    return this.enabledServices;
  }

}
