const fs = require('fs');
const mkdirp = require('mkdirp');
const FanController = require('./lib/FanController.js');
const Events = require('./lib/Events.js');

let Service, Characteristic, Homebridge, Accessory;

const PLUGIN_NAME = 'homebridge-xiaomi-fan';
const PLATFORM_NAME = 'xiaomifan';
const PLUGIN_VERSION = '1.4.8';

// General constants
const BATTERY_LOW_THRESHOLD = 20;
const BUTTON_RESET_TIMEOUT = 20; // in milliseconds

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Homebridge = homebridge;
  Accessory = homebridge.platformAccessory;
  homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, xiaomiFanPlatform, true);
};

class xiaomiFanDevice {
  constructor(log, config, api) {
    this.log = log;
    this.api = api;

    // check if we have mandatory device info
    try {
      if (!config.ip) throw new Error(`'ip' is required but not defined for ${config.name}!`);
      if (!config.token) throw new Error(`'token' is required but not defined for ${config.name}!`);
    } catch (error) {
      this.logError(error);
      this.logError(`Failed to create platform device, missing mandatory information!`);
      this.logError(`Please check your device config!`);
      return;
    }

    // configuration
    this.name = config['name'];
    this.ip = config['ip'];
    this.token = config['token'];
    this.deviceId = config['deviceId'];
    this.model = config['model'];
    this.pollingInterval = config['pollingInterval'] || 5;
    this.pollingInterval = this.pollingInterval * 1000;
    this.prefsDir = config['prefsDir'] || api.user.storagePath() + '/.xiaomiFan/';
    this.deepDebugLog = config.deepDebugLog;
    if (this.deepDebugLog === undefined) {
      this.deepDebugLog = false;
    }
    this.buzzerControl = config['buzzerControl'];
    if (this.buzzerControl == undefined) {
      this.buzzerControl = true;
    }
    this.ledControl = config['ledControl'];
    if (this.ledControl == undefined) {
      this.ledControl = true;
    }
    this.naturalModeControl = config['naturalModeControl'];
    if (this.naturalModeControl == undefined) {
      this.naturalModeControl = true;
    }
    this.sleepModeControl = config['sleepModeControl'];
    if (this.sleepModeControl == undefined) {
      this.sleepModeControl = true;
    }
    this.moveControl = config['moveControl'];
    if (this.moveControl == undefined) {
      this.moveControl = false;
    }
    this.fanLevelControl = config['fanLevelControl'];
    if (this.fanLevelControl == undefined) {
      this.fanLevelControl = true;
    }
    this.shutdownTimer = config['shutdownTimer'];
    if (this.shutdownTimer == undefined) {
      this.shutdownTimer = false;
    }
    this.ioniserControl = config['ioniserControl'];
    if (this.ioniserControl == undefined) {
      this.ioniserControl = false;
    }
    this.angleButtons = config['angleButtons'];
    this.verticalAngleButtons = config['verticalAngleButtons'];


    this.logInfo(`Init - got fan configuration, initializing device with name: ${this.name}`);


    // check if prefs directory ends with a /, if not then add it
    if (this.prefsDir.endsWith('/') === false) {
      this.prefsDir = this.prefsDir + '/';
    }

    // check if the fan preferences directory exists, if not then create it
    if (fs.existsSync(this.prefsDir) === false) {
      mkdirp(this.prefsDir);
    }

    // create fan model info file name
    this.fanInfoFile = this.prefsDir + 'info_' + this.ip.split('.').join('') + '_' + this.token;

    // prepare variables
    this.fanDevice = undefined;
    this.cachedFanInfo = {};
    this.rotationSpeedTimeout = null; // for rotation speed set debounce

    //try to load cached fan info
    this.loadFanInfo();

    //start the fan discovery
    this.discoverFan();
  }


  /*----------========== SETUP ==========----------*/

  discoverFan() {
    // if the user specified a model then use that, else try to get cached model
    let fanController = new FanController(this.ip, this.token, this.deviceId, this.model || this.cachedFanInfo.model, this.name, this.pollingInterval, this.log);
    fanController.setDeepDebugLogEnabled(this.deepDebugLog);

    fanController.on(Events.FAN_DEVICE_READY, (fanDevice) => {
      this.fanDevice = fanDevice;

      //prepare the fan accessory and services
      if (!this.fanAccesory) {
        this.initFanAccessory();
      }
    });

    fanController.on(Events.FAN_CONNECTED, (fanDevice) => {
      // update fan information
      this.updateInformationService();
      // save fan information
      this.saveFanInfo();
    });

    fanController.on(Events.FAN_DISCONNECTED, (fanDevice) => {
      this.updateFanStatus();
    });

    fanController.on(Events.FAN_PROPERTIES_UPDATED, (fanDevice) => {
      this.updateFanStatus();
    });

    fanController.connectToFan();
  }


  /*----------========== SETUP SERVICES ==========----------*/

  initFanAccessory() {
    // generate uuid
    this.UUID = Homebridge.hap.uuid.generate(this.token + this.ip);

    // prepare the fan accessory
    this.fanAccesory = new Accessory(this.name, this.UUID, Homebridge.hap.Accessory.Categories.FAN);

    // prepare accessory services
    if (this.fanDevice) {
      this.setupAccessoryServices();
    }

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.fanAccesory]);
  }

  setupAccessoryServices() {
    // update the services
    this.updateInformationService();

    // prepare the fan service
    this.prepareFanService();

    // additional services
    this.prepareMoveControlService();
    this.prepareBuzzerControlService();
    this.prepareLedControlService();
    this.prepareNaturalModeControlService();
    this.prepareShutdownTimerService();
    this.prepareAngleButtonsService();
    this.prepareVerticalAngleButtonsService();
    this.prepareFanLevelControlService();
    this.prepareSleepModeControlService();
    this.prepareIoniserControlService();
    this.prepareTemperatureService();
    this.prepareRelativeHumidityService();
    this.prepareBatteryService();
  }

  updateInformationService() {
    // remove the preconstructed information service, since i will be adding my own
    this.fanAccesory.removeService(this.fanAccesory.getService(Service.AccessoryInformation));

    let fanModel = this.fanDevice.getFanModel() || 'Unknown';
    let fanDeviceId = this.fanDevice.getDeviceId() || 'Unknown';

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Name, this.name)
      .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
      .setCharacteristic(Characteristic.Model, fanModel)
      .setCharacteristic(Characteristic.SerialNumber, fanDeviceId)
      .setCharacteristic(Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.fanAccesory.addService(this.informationService);
  }

  prepareFanService() {
    this.fanService = new Service.Fanv2(this.name, 'fanService');
    this.fanService
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.CurrentFanState) // for what is this used?
      .on('get', this.getFanState.bind(this));
    if (this.fanDevice.supportsFanSpeed()) {
      this.fanService
        .addCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getRotationSpeed.bind(this))
        .on('set', this.setRotationSpeed.bind(this));
    }
    this.fanService
      .addCharacteristic(Characteristic.LockPhysicalControls)
      .on('get', this.getLockPhysicalControls.bind(this))
      .on('set', this.setLockPhysicalControls.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.SwingMode)
      .on('get', this.getSwingMode.bind(this))
      .on('set', this.setSwingMode.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.TargetFanState)
      .on('get', this.getVerticalSwingMode.bind(this))
      .on('set', this.setVerticalSwingMode.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.RotationDirection) // used to switch between buzzer levels on supported devices
      .on('get', this.getRotationDirection.bind(this))
      .on('set', this.setRotationDirection.bind(this));

    this.fanAccesory.addService(this.fanService);
  }

  prepareMoveControlService() {
    if (this.moveControl && this.fanDevice.supportsLeftRightMove()) {
      this.moveLeftService = new Service.Switch(this.name + ' Move left', 'moveLeftService');
      this.moveLeftService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMoveFanSwitch.bind(this))
        .on('set', (state, callback) => {
          this.setMoveFanSwitch(state, callback, 'left');
        });

      this.fanAccesory.addService(this.moveLeftService);

      this.moveRightService = new Service.Switch(this.name + ' Move right', 'moveRightService');
      this.moveRightService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMoveFanSwitch.bind(this))
        .on('set', (state, callback) => {
          this.setMoveFanSwitch(state, callback, 'right');
        });

      this.fanAccesory.addService(this.moveRightService);
    }

    if (this.moveControl && this.fanDevice.supportsUpDownMove()) {
      this.moveUpService = new Service.Switch(this.name + ' Move Up', 'moveUpService');
      this.moveUpService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMoveFanSwitch.bind(this))
        .on('set', (state, callback) => {
          this.setMoveFanSwitch(state, callback, 'up');
        });

      this.fanAccesory.addService(this.moveUpService);

      this.moveDownService = new Service.Switch(this.name + ' Move down', 'moveDownService');
      this.moveDownService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getMoveFanSwitch.bind(this))
        .on('set', (state, callback) => {
          this.setMoveFanSwitch(state, callback, 'down');
        });

      this.fanAccesory.addService(this.moveDownService);
    }
  }

  prepareBuzzerControlService() {
    if (this.buzzerControl && this.fanDevice.supportsBuzzerControl()) {
      this.buzzerService = new Service.Switch(this.name + ' Buzzer', 'buzzerService');
      this.buzzerService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getBuzzer.bind(this))
        .on('set', this.setBuzzer.bind(this));

      this.fanAccesory.addService(this.buzzerService);
    }
  }

  prepareLedControlService() {
    if (this.ledControl && this.fanDevice.supportsLedControl()) {
      if (this.fanDevice.supportsLedBrightness()) {
        // if brightness supported then add a lightbulb for controlling
        this.ledBrightnessService = new Service.Lightbulb(this.name + ' LED', 'ledBrightnessService');
        this.ledBrightnessService
          .getCharacteristic(Characteristic.On)
          .on('get', this.getLed.bind(this))
          .on('set', this.setLed.bind(this));
        this.ledBrightnessService
          .addCharacteristic(new Characteristic.Brightness())
          .on('get', this.getLedBrightness.bind(this))
          .on('set', this.setLedBrightness.bind(this));

        this.fanAccesory.addService(this.ledBrightnessService);
      } else if (this.fanDevice.supportsLedControl()) {
        // if not then just a simple switch
        this.ledService = new Service.Switch(this.name + ' LED', 'ledService');
        this.ledService
          .getCharacteristic(Characteristic.On)
          .on('get', this.getLed.bind(this))
          .on('set', this.setLed.bind(this));

        this.fanAccesory.addService(this.ledService);
      }
    }
  }

  prepareNaturalModeControlService() {
    if (this.naturalModeControl && this.fanDevice.supportsNaturalMode()) {
      this.naturalModeControlService = new Service.Switch(this.name + ' Natural mode', 'naturalModeControlService');
      this.naturalModeControlService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getNaturalMode.bind(this))
        .on('set', this.setNaturalMode.bind(this));

      this.fanAccesory.addService(this.naturalModeControlService);
    }
  }

  prepareSleepModeControlService() {
    if (this.sleepModeControl && this.fanDevice.supportsSleepMode()) {
      this.sleepModeControlService = new Service.Switch(this.name + ' Sleep mode', 'sleepModeControlService');
      this.sleepModeControlService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getSleepMode.bind(this))
        .on('set', this.setSleepMode.bind(this));

      this.fanAccesory.addService(this.sleepModeControlService);
    }
  }

  prepareShutdownTimerService() {
    if (this.shutdownTimer && this.fanDevice.supportsPowerOffTimer()) {
      this.shutdownTimerService = new Service.Lightbulb(this.name + ' Shutdown timer', 'shutdownTimerService');
      this.shutdownTimerService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getShutdownTimerEnabled.bind(this))
        .on('set', this.setShutdownTimerEnabled.bind(this));
      this.shutdownTimerService
        .addCharacteristic(new Characteristic.Brightness())
        .on('get', this.getShutdownTimer.bind(this))
        .on('set', this.setShutdownTimer.bind(this));

      this.fanAccesory.addService(this.shutdownTimerService);
    }
  }

  prepareAngleButtonsService() {
    if (this.fanDevice.supportsOscillationAngle() === false && this.fanDevice.supportsOscillationLevels() === false) {
      return;
    }

    if (this.angleButtons === false) {
      return;
    }

    if (this.angleButtons === undefined || this.angleButtons === null) {
      if (this.fanDevice.supportsOscillationLevels()) {
        // if the fan supports osicllation levels, and user did not specify the property then show all oscillation levels
        this.angleButtons = this.fanDevice.oscillationLevels();
      } else {
        return;
      }
    }

    if (Array.isArray(this.angleButtons) === false) {
      this.logWarn('The angle buttons service needs to be defined as an array! Please correct your config.json if you want to use the service.');
      return;
    }

    this.angleButtonsService = new Array();
    this.angleButtons.forEach((value, i) => {
      let parsedValue = parseInt(value);

      if (this.checkAngleButtonValue(parsedValue) === false) {
        return;
      }

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

      this.fanAccesory.addService(tmpAngleButton);
      this.angleButtonsService.push(tmpAngleButton);
    });
  }

  prepareVerticalAngleButtonsService() {
    if (this.fanDevice.supportsVerticalOscillationAngle() === false && this.fanDevice.supportsOscillationVerticalLevels() === false) {
      return;
    }

    if (this.verticalAngleButtons === false) {
      return;
    }

    if (this.verticalAngleButtons === undefined || this.verticalAngleButtons === null) {
      if (this.fanDevice.supportsOscillationVerticalLevels()) {
        // if the fan supports vertical oscillation levels, and user did not specify the property then show all oscillation levels
        this.verticalAngleButtons = this.fanDevice.oscillationVerticalLevels();
      } else {
        return;
      }
    }

    if (Array.isArray(this.verticalAngleButtons) === false) {
      this.logWarn('The vertical angle buttons service needs to be defined as an array! Please correct your config.json if you want to use the service.');
      return;
    }

    this.verticalAngleButtonsService = new Array();
    this.verticalAngleButtons.forEach((value, i) => {
      let parsedValue = parseInt(value);

      if (this.checkVerticalAngleButtonValue(parsedValue) === false) {
        return;
      }

      this.verticalAngleButtons[i] = parsedValue;
      let tmpAngleButton = new Service.Switch(this.name + ' Vertical Angle - ' + parsedValue, 'verticalAngleButtonService' + i);
      tmpAngleButton
        .getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.getVerticalAngleButtonState(callback, parsedValue);
        })
        .on('set', (state, callback) => {
          this.setVerticalAngleButtonState(state, callback, parsedValue);
        });

      this.fanAccesory.addService(tmpAngleButton);
      this.verticalAngleButtonsService.push(tmpAngleButton);
    });
  }

  prepareFanLevelControlService() {
    if (this.fanLevelControl && this.fanDevice.supportsFanLevel()) {
      this.fanLevelControlService = new Array();
      for (let i = 1; i <= this.fanDevice.numberOfFanLevels(); i++) {
        let tmpFanLevelButton = new Service.Switch(this.name + ' Level ' + i, 'levelControlService' + i);
        tmpFanLevelButton
          .getCharacteristic(Characteristic.On)
          .on('get', (callback) => {
            this.getFanLevelState(callback, i);
          })
          .on('set', (state, callback) => {
            this.setFanLevelState(state, callback, i);
          });

        this.fanAccesory.addService(tmpFanLevelButton);
        this.fanLevelControlService.push(tmpFanLevelButton);
      }
    }
  }

  prepareIoniserControlService() {
    if (this.ioniserControl && this.fanDevice.supportsIoniser()) {
      this.ioniserControlService = new Service.Switch(this.name + ' Ioniser', 'ioniserControlService');
      this.ioniserControlService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getIoniserState.bind(this))
        .on('set', this.setIoniserState.bind(this));

      this.fanAccesory.addService(this.ioniserControlService);
    }
  }

  prepareTemperatureService() {
    if (this.fanDevice.supportsTemperatureReporting()) {
      this.temperatureService = new Service.TemperatureSensor(this.name + ' Temp', 'temperatureService');
      this.temperatureService
        .setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
        .setCharacteristic(Characteristic.StatusTampered, Characteristic.StatusTampered.NOT_TAMPERED)
        .setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      this.temperatureService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getCurrentTemperature.bind(this));

      this.fanAccesory.addService(this.temperatureService);
    }
  }

  prepareRelativeHumidityService() {
    if (this.fanDevice.supportsRelativeHumidityReporting()) {
      this.relativeHumidityService = new Service.HumiditySensor(this.name + ' Humidity', 'relativeHumidityService');
      this.relativeHumidityService
        .setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
        .setCharacteristic(Characteristic.StatusTampered, Characteristic.StatusTampered.NOT_TAMPERED)
        .setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      this.relativeHumidityService
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', this.getCurrentRelativeHumidity.bind(this));

      this.fanAccesory.addService(this.relativeHumidityService);
    }
  }

  prepareBatteryService() {
    if (this.fanDevice.hasBuiltInBattery() && this.fanDevice.supportsBatteryStateReporting()) {
      this.batteryService = new Service.BatteryService(this.name + ' Battery', 'batteryService');
      this.batteryService
        .setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING)
        .setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      this.batteryService
        .getCharacteristic(Characteristic.BatteryLevel)
        .on('get', this.getBatteryLevel.bind(this));
      this.batteryService
        .getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', this.getBatteryLevelStatus.bind(this));

      this.fanAccesory.addService(this.batteryService);
    }
  }


  /*----------========== HOMEBRIDGE STATE SETTERS/GETTERS ==========----------*/

  getPowerState(callback) {
    let isFanOn = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isFanOn = this.fanDevice.isPowerOn();
    }
    callback(null, isFanOn ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
  }

  setPowerState(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      let isPowerOn = state === Characteristic.Active.ACTIVE;
      // only fire the setPowerOn method when we want to turn off the fan or the fan is off
      // the rotaion speed slider fires this method many times even when the fan is already on so i need to limit that
      if (isPowerOn === false || this.fanDevice.isPowerOn() === false) {
        this.fanDevice.setPowerOn(isPowerOn);
      }
      callback();
    } else {
      callback(this.createError(`cannot set power state`));
    }
  }

  getFanState(callback) {
    let fanState = Characteristic.CurrentFanState.INACTIVE;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      fanState = this.fanDevice.isPowerOn() ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE
    }
    callback(null, fanState);
  }

  getRotationSpeed(callback) {
    let fanRotationSpeed = 0;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      fanRotationSpeed = this.fanDevice.getRotationSpeed();
    }
    callback(null, fanRotationSpeed);
  }

  setRotationSpeed(value, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      // use debounce to limit the number of calls when the user slides the rotation slider
      if (this.rotationSpeedTimeout) clearTimeout(this.rotationSpeedTimeout);
      this.rotationSpeedTimeout = setTimeout(() => this.fanDevice.setRotationSpeed(value), 500);
      callback();
    } else {
      callback(this.createError(`cannot set rotation speed`));
    }
  }

  getLockPhysicalControls(callback) {
    let isChildLockActive = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isChildLockActive = this.fanDevice.isChildLockActive();
    }
    callback(null, isChildLockActive ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
  }

  setLockPhysicalControls(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      let isChildLockActive = state === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED;
      this.fanDevice.setChildLock(isChildLockActive);
      callback();
    } else {
      callback(this.createError(`cannot set child lock state`));
    }
  }

  getSwingMode(callback) {
    let isSwingModeActive = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isSwingModeActive = this.fanDevice.isSwingModeEnabled();
    }
    callback(null, isSwingModeActive ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
  }

  setSwingMode(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      let isSwingModeActive = state === Characteristic.SwingMode.SWING_ENABLED;
      this.fanDevice.setSwingModeEnabled(isSwingModeActive);
      this.updateAngleButtonsAndSwingMode(null, isSwingModeActive); // update the angel buttons if enabled
      callback();
    } else {
      callback(this.createError(`cannot set swing mode state`));
    }
  }

  getVerticalSwingMode(callback) {
    let isVerticalSwingModeActive = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isVerticalSwingModeActive = this.fanDevice.isVerticalSwingModeEnabled();
    }
    callback(null, isVerticalSwingModeActive ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL);
  }

  setVerticalSwingMode(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      let isVerticalSwingModeActive = state === Characteristic.TargetFanState.AUTO;
      this.fanDevice.setVerticalSwingModeEnabled(isVerticalSwingModeActive);
      this.updateVerticalAngleButtonsAndSwingMode(null, isVerticalSwingModeActive); // update the vertical angel buttons if enabled
      callback();
    } else {
      callback(this.createError(`cannot set vertical swing mode state`));
    }
  }

  getRotationDirection(callback) {
    let buzzerLevel = 2;
    if (this.fanDevice && this.fanDevice.isFanConnected() && this.fanDevice.supportsBuzzerLevelControl()) {
      buzzerLevel = this.fanDevice.getBuzzerLevel();
    }
    callback(null, buzzerLevel === 1 ? Characteristic.RotationDirection.CLOCKWISE : Characteristic.RotationDirection.COUNTER_CLOCKWISE);
  }

  setRotationDirection(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected() && this.fanDevice.supportsBuzzerLevelControl()) {
      if (this.fanDevice.isBuzzerEnabled() === true) {
        let buzzerLevel = state === Characteristic.RotationDirection.CLOCKWISE ? 1 : 2;
        this.fanDevice.setBuzzerLevel(buzzerLevel);
      }
      callback();
    } else {
      callback(this.createError(`cannot set buzzer level`));
    }
  }

  getMoveFanSwitch(callback) {
    callback(null, false);
  }

  setMoveFanSwitch(state, callback, direction) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (direction === 'left') {
        this.fanDevice.moveLeft();
      } else if (direction === 'right') {
        this.fanDevice.moveRight();
      } else if (direction === 'up') {
        this.fanDevice.moveUp();
      } else if (direction === 'down') {
        this.fanDevice.moveDown();
      }
      setTimeout(() => {
        if (this.moveLeftService) this.moveLeftService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.moveRightService) this.moveRightService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.moveUpService) this.moveUpService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.moveDownService) this.moveDownService.getCharacteristic(Characteristic.On).updateValue(false);
      }, BUTTON_RESET_TIMEOUT);
      callback();
    } else {
      callback(this.createError(`cannot move fan`));
    }
  }

  getBuzzer(callback) {
    let isBuzzerEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isBuzzerEnabled = this.fanDevice.isBuzzerEnabled();
    }
    callback(null, isBuzzerEnabled);
  }

  setBuzzer(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      this.fanDevice.setBuzzerEnabled(state);
      callback();
    } else {
      callback(this.createError(`cannot set buzzer state`));
    }
  }

  getLed(callback) {
    let isLedEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isLedEnabled = this.fanDevice.isLedEnabled();
    }
    callback(null, isLedEnabled);
  }

  setLed(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (state === false || this.fanDevice.isLedEnabled() === false) {
        this.fanDevice.setLedEnabled(state);
      }
      callback();
    } else {
      callback(this.createError(`cannot set LED state`));
    }
  }

  getLedBrightness(callback) {
    let ledBrightness = 0;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      ledBrightness = this.fanDevice.getLedBrightness();
    }
    callback(null, ledBrightness);
  }

  setLedBrightness(value, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      this.fanDevice.setLedBrightness(value);
      callback();
    } else {
      callback(this.createError(`cannot set LED brightness`));
    }
  }

  getNaturalMode(callback) {
    let naturalModeButtonEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      naturalModeButtonEnabled = this.fanDevice.isNaturalModeEnabled();
    }
    callback(null, naturalModeButtonEnabled);
  }

  setNaturalMode(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      this.fanDevice.setNaturalModeEnabled(state);
      callback();
    } else {
      callback(this.createError(`cannot set natural mode state`));
    }
  }

  getSleepMode(callback) {
    let sleepModeButtonEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      sleepModeButtonEnabled = this.fanDevice.isSleepModeEnabled();
    }
    callback(null, sleepModeButtonEnabled);
  }

  setSleepMode(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      this.fanDevice.setSleepModeEnabled(state);
      callback();
    } else {
      callback(this.createError(`cannot set sleep mode state`));
    }
  }

  getShutdownTimerEnabled(callback) {
    let isShutdownTimerEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      isShutdownTimerEnabled = this.fanDevice.isShutdownTimerEnabled();
    }
    callback(null, isShutdownTimerEnabled);
  }

  setShutdownTimerEnabled(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
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
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      shutdownTimerTime = this.fanDevice.getShutdownTimer();
    }
    callback(null, shutdownTimerTime);
  }

  setShutdownTimer(level, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      this.fanDevice.setShutdownTimer(level);
      callback();
    } else {
      callback(this.createError(`cannot set shutdown timer time`));
    }
  }

  getAngleButtonState(callback, angle) {
    let angleButtonEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (this.fanDevice.isPowerOn() && this.fanDevice.isSwingModeEnabled()) {
        angleButtonEnabled = this.fanDevice.getAngle() === angle;
      }
    }
    callback(null, angleButtonEnabled);
  }

  setAngleButtonState(state, callback, angle) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (state) {
        // if swing mode disabled then turn it on
        if (this.fanDevice.isSwingModeEnabled() === false) {
          this.fanDevice.setSwingModeEnabled(true);
        }
        this.fanDevice.setAngle(angle);
      } else {
        this.fanDevice.setSwingModeEnabled(false);
      }
      this.updateAngleButtonsAndSwingMode(angle, state);
      callback();
    } else {
      callback(this.createError(`cannot set swing angle`));
    }
  }

  getVerticalAngleButtonState(callback, angle) {
    let verticalAngleButtonEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (this.fanDevice.isPowerOn() && this.fanDevice.isVerticalSwingModeEnabled()) {
        verticalAngleButtonEnabled = this.fanDevice.getVerticalAngle() === angle;
      }
    }
    callback(null, verticalAngleButtonEnabled);
  }

  setVerticalAngleButtonState(state, callback, angle) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (state) {
        // if swing mode disabled then turn it on
        if (this.fanDevice.isVerticalSwingModeEnabled() === false) {
          this.fanDevice.setVerticalSwingModeEnabled(true);
        }
        this.fanDevice.setVerticalAngle(angle);
      } else {
        this.fanDevice.setVerticalSwingModeEnabled(false);
      }
      this.updateVerticalAngleButtonsAndSwingMode(angle, state);
      callback();
    } else {
      callback(this.createError(`cannot set vertical swing angle`));
    }
  }

  getFanLevelState(callback, level) {
    let levelButtonEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected() && this.fanDevice.isPowerOn()) {
      levelButtonEnabled = this.fanDevice.getFanLevel() === level;
    }
    callback(null, levelButtonEnabled);
  }

  setFanLevelState(state, callback, level) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      if (state) {
        // if fan turned off then turn it on
        if (this.fanDevice.isPowerOn() === false) {
          this.fanDevice.setPowerOn(true);
        }
        this.fanDevice.setFanLevel(level);
      }
      setTimeout(() => {
        this.updateFanLevelButtons();
      }, BUTTON_RESET_TIMEOUT);
      callback();
    } else {
      callback(this.createError(`cannot set fan level`));
    }
  }

  getIoniserState(callback) {
    let ioniserButtonEnabled = false;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      ioniserButtonEnabled = this.fanDevice.isIoniserEnabled();
    }
    callback(null, ioniserButtonEnabled);
  }

  setIoniserState(state, callback) {
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      this.fanDevice.setIoniserEnabled(state);
      callback();
    } else {
      callback(this.createError(`cannot set ioniser state`));
    }
  }

  getCurrentTemperature(callback) {
    let temp = 0;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      temp = this.fanDevice.getTemperature();
    }
    callback(null, temp);
  }

  getCurrentRelativeHumidity(callback) {
    let relHumidity = 0;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      relHumidity = this.fanDevice.getRelativeHumidity();
    }
    callback(null, relHumidity);
  }

  getBatteryLevel(callback) {
    let batteryLevel = 0;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      batteryLevel = this.fanDevice.getBatteryLevel();
    }
    callback(null, batteryLevel);
  }

  getBatteryLevelStatus(callback) {
    let batteryLevelStatus = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    if (this.fanDevice && this.fanDevice.isFanConnected()) {
      batteryLevelStatus = this.fanDevice.getBatteryLevel() <= BATTERY_LOW_THRESHOLD ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
    callback(null, batteryLevelStatus);
  }


  /*----------========== HELPERS ==========----------*/

  updateFanStatus() {
    if (this.fanDevice) {
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.Active).updateValue(this.fanDevice.isPowerOn() ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
      if (this.fanService && this.fanDevice.supportsFanSpeed()) this.fanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.fanDevice.getRotationSpeed());
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.LockPhysicalControls).updateValue(this.fanDevice.isChildLockActive() ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
      if (this.fanService && this.fanDevice.supportsBuzzerLevelControl()) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(this.fanDevice.getBuzzerLevel() === 1 ? Characteristic.RotationDirection.CLOCKWISE : Characteristic.RotationDirection.COUNTER_CLOCKWISE);
      if (this.buzzerService) this.buzzerService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isBuzzerEnabled());
      if (this.ledService) this.ledService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isLedEnabled());
      if (this.ledBrightnessService) this.ledBrightnessService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isLedEnabled());
      if (this.ledBrightnessService) this.ledBrightnessService.getCharacteristic(Characteristic.Brightness).updateValue(this.fanDevice.getLedLevel());
      if (this.naturalModeControlService) this.naturalModeControlService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isNaturalModeEnabled());
      if (this.sleepModeControlService) this.sleepModeControlService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isSleepModeEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isShutdownTimerEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.Brightness).updateValue(this.fanDevice.getShutdownTimer());
      if (this.ioniserControlService) this.ioniserControlService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isIoniserEnabled());
      if (this.temperatureService) this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.fanDevice.getTemperature());
      if (this.relativeHumidityService) this.relativeHumidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(this.fanDevice.getRelativeHumidity());
      if (this.batteryService) this.batteryService.getCharacteristic(Characteristic.BatteryLevel).updateValue(this.fanDevice.getBatteryLevel());
      if (this.batteryService) this.batteryService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(this.fanDevice.getBatteryLevel() <= BATTERY_LOW_THRESHOLD ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      this.updateAngleButtonsAndSwingMode(null, this.fanDevice.isSwingModeEnabled());
      this.updateVerticalAngleButtonsAndSwingMode(null, this.fanDevice.isVerticalSwingModeEnabled());
      this.updateFanLevelButtons();
    }
  }

  updateAngleButtonsAndSwingMode(activeAngle, enabled) {
    if (this.fanService) this.fanService.getCharacteristic(Characteristic.SwingMode).updateValue(enabled ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
    if (this.angleButtonsService) {
      // if swing mode disabled or the fan is not turned on then just disable all the angle switches
      if (enabled === false || this.fanDevice.isPowerOn() === false) {
        activeAngle = "disabled"; // use fake value for angle
      }

      // if angle not specified then automatically update the status
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

  updateVerticalAngleButtonsAndSwingMode(activeAngle, enabled) {
    if (this.fanService) this.fanService.getCharacteristic(Characteristic.TargetFanState).updateValue(enabled ? Characteristic.TargetFanState.AUTO : Characteristic.TargetFanState.MANUAL);
    if (this.verticalAngleButtonsService) {
      // if swing mode disabled or the fan is not turned on then just disable all the angle switches
      if (enabled === false || this.fanDevice.isPowerOn() === false) {
        activeAngle = "disabled"; // use fake value for angle
      }

      // if angle not specified then automatically update the status
      if (activeAngle === undefined || activeAngle === null) {
        activeAngle = this.fanDevice.getVerticalAngle();
      }

      this.verticalAngleButtonsService.forEach((tmpAngleButton, i) => {
        if (activeAngle === this.verticalAngleButtons[i]) {
          tmpAngleButton.getCharacteristic(Characteristic.On).updateValue(true);
        } else {
          tmpAngleButton.getCharacteristic(Characteristic.On).updateValue(false);
        }
      });
    }
  }

  updateFanLevelButtons() {
    if (this.fanLevelControlService) {
      let currentLevel = this.fanDevice.getFanLevel();
      this.fanLevelControlService.forEach((tmpFanLevelButton, i) => {
        if (currentLevel === i + 1 && this.fanDevice.isPowerOn()) { // levels start from 1, index from 0 hence add 1
          tmpFanLevelButton.getCharacteristic(Characteristic.On).updateValue(true);
        } else {
          tmpFanLevelButton.getCharacteristic(Characteristic.On).updateValue(false);
        }
      });
    }
  }

  createError(msg) {
    return new Error(`[${this.name}] Fan is not connected, ` + msg);
  }

  saveFanInfo() {
    // save model name and deviceId
    if (this.fanDevice) {
      this.cachedFanInfo.model = this.fanDevice.getFanModel();
      this.cachedFanInfo.deviceId = this.fanDevice.getDeviceId();
      fs.writeFile(this.fanInfoFile, JSON.stringify(this.cachedFanInfo), (err) => {
        if (err) {
          this.logDebug('Error occured could not write fan model info %s', err);
        } else {
          this.logDebug('Successfully saved fan info!');
        }
      });
    }
  }

  loadFanInfo() {
    try {
      this.cachedFanInfo = JSON.parse(fs.readFileSync(this.fanInfoFile));
    } catch (err) {
      this.logDebug('Fan info file does not exist yet, device unknown!');
    }
  }

  checkAngleButtonValue(angleValue) {
    if (this.fanDevice.supportsOscillationAngle()) {
      // if specified angle not within range then show a a warning and stop processing this value
      if (this.fanDevice.checkOscillationAngleWithinRange(angleValue) === false) {
        this.logWarn(`Specified angle ${angleValue} is not within the supported range ${JSON.stringify(this.fanDevice.oscillationAngleRange())}. Not adding angle button!`);
        return false;
      }
    } else if (this.fanDevice.supportsOscillationLevels()) {
      // if the fan uses predefined osiscllation levels then check if the specified angle is on the list
      if (this.fanDevice.checkOscillationLevelSupported(angleValue) === false) {
        this.logWarn(`Specified angle ${angleValue} is not within the supported angle levels of your fan. Allowed values: ${JSON.stringify(this.fanDevice.oscillationLevels())}. Not adding angle button!`);
        return false;
      }
    }

    return true;
  }

  checkVerticalAngleButtonValue(angleValue) {
    if (this.fanDevice.supportsVerticalOscillationAngle()) {
      // if specified angle not within range then show a a warning and stop processing this value
      if (this.fanDevice.checkVerticalOscillationAngleWithinRange(angleValue) === false) {
        this.logWarn(`Specified vertical angle ${angleValue} is not within the supported vertical range ${JSON.stringify(this.fanDevice.oscillationVerticalAngleRange())}. Not adding angle button!`);
        return false;
      }
    } else if (this.fanDevice.supportsOscillationVerticalLevels()) {
      // if the fan uses predefined vertical oscillation levels then check if the specified angle is on the list
      if (this.fanDevice.checkVerticalOscillationLevelSupported(angleValue) === false) {
        this.logWarn(`Specified vertical angle ${angleValue} is not within the supported vertical angle levels of your fan. Allowed values: ${JSON.stringify(this.fanDevice.verticalOscillationLevels())}. Not adding angle button!`);
        return false;
      }
    }

    return true;
  }

  /*----------========== LOG ==========----------*/

  logInfo(message, ...args) {
    this.log.info((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

  logWarn(message, ...args) {
    this.log.warn((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

  logDebug(message, ...args) {
    this.log.debug((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

  logError(message, ...args) {
    this.log.error((this.name ? `[${this.name}] ` : "") + message, ...args);
  }

}


/*----------========== PLATFORM STUFF ==========----------*/
class xiaomiFanPlatform {
  constructor(log, config, api) {

    this.fans = [];
    this.log = log;
    this.api = api;
    this.config = config;

    if (this.api) {
      /*
       * When this event is fired, homebridge restored all cached accessories from disk and did call their respective
       * `configureAccessory` method for all of them. Dynamic Platform plugins should only register new accessories
       * after this event was fired, in order to ensure they weren't added to homebridge already.
       * This event can also be used to start discovery of new accessories.
       */
      this.api.on("didFinishLaunching", () => {
        this.removeAccessories(); // remove all cached devices, we do not want to use cache for now, maybe in future?
        this.initDevices();
      });
    }

  }

  /*
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory) {
    this.log.debug("Found cached accessory %s", accessory.displayName);
    this.fans.push(accessory);
  }

  // ------------ CUSTOM METHODS ------------

  initDevices() {
    this.log.info('Init - initializing devices');

    // read from config.devices
    if (this.config.devices && Array.isArray(this.config.devices)) {
      for (let device of this.config.devices) {
        if (device) {
          new xiaomiFanDevice(this.log, device, this.api);
        }
      }
    } else if (this.config.devices) {
      this.log.info('The devices property is not of type array. Cannot initialize. Type: %s', typeof this.config.devices);
    }

    // also read from config.fans
    if (this.config.fans && Array.isArray(this.config.fans)) {
      for (let fan of this.config.fans) {
        if (fan) {
          new xiaomiFanDevice(this.log, fan, this.api);
        }
      }
    } else if (this.config.fans) {
      this.log.info('The fans property is not of type array. Cannot initialize. Type: %s', typeof this.config.fans);
    }

    if (!this.config.devices && !this.config.fans) {
      this.log.info('-------------------------------------------');
      this.log.info('Init - no fan configuration found');
      this.log.info('Missing devices or fans in your platform config');
      this.log.info('-------------------------------------------');
    }

  }

  removeAccessories() {
    // we don't have any special identifiers, we just remove all our accessories
    this.log.debug("Removing all cached accessories");
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.fans);
    this.fans = []; // clear out the array
  }

  removeAccessory(accessory) {
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.fans = this.fans.filter(item => item !== accessory);
  }


}
