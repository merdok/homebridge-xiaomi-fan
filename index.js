const miio = require('miio');
const fs = require('fs');
const mkdirp = require('mkdirp');
const FanDeviceFactory = require('./devices/fanDeviceFactory.js');

let Service, Characteristic, Homebridge, Accessory;

const PLUGIN_NAME = 'homebridge-xiaomi-fan';
const PLATFORM_NAME = 'xiaomifan';
const PLUGIN_VERSION = '1.3.1';

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
    this.naturalModeButton = config['naturalModeButton'];
    if (this.naturalModeButton == undefined) {
      this.naturalModeButton = true;
    }
    this.shutdownTimer = config['shutdownTimer'];
    if (this.shutdownTimer == undefined) {
      this.shutdownTimer = false;
    }
    this.angleButtons = config['angleButtons'];


    this.logInfo(`Init - got Fan configuration, initializing device with name: ${this.name}`);


    // check if prefs directory ends with a /, if not then add it
    if (this.prefsDir.endsWith('/') === false) {
      this.prefsDir = this.prefsDir + '/';
    }

    // check if the fan preferences directory exists, if not then create it
    if (fs.existsSync(this.prefsDir) === false) {
      mkdirp(this.prefsDir);
    }

    // prepare variables
    this.fanDevice = undefined;

    //prepare the services
    this.initFanAccessory();

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
      this.setupDevice(device);
    }).catch(err => {
      this.logDebug(err);
      this.logDebug(`Fan not found! Retrying in ${checkDelayTime/1000} seconds!`);
      setTimeout(() => {
        this.connectToFan();
      }, checkDelayTime);
    });
  }

  setupDevice(miioDevice) {
    let fanModel = miioDevice.miioModel;

    // create the fan device
    this.fanDevice = FanDeviceFactory.createFanDevice(miioDevice, this.ip, this.token, this.deviceId, this.name, this.pollingInterval, this.log, this);

    if (this.fanDevice) {

      // do devices specific fan service updates
      if (this.fanDevice.supportsSleepMode()) {
        this.renameNaturalModeButtonToSleepMode();
      }

      // register for the fan update properties event
      this.fanDevice.on('fanPropertiesUpdated', (res) => {
        this.updateFanStatus();
      });

      //  remove the information service here and add the new one after setup is complete, this way i do not have to save anything?
      this.updateInformationService();

    } else {
      this.logError(`Error creating fan device!`);
    }

  }


  /*----------========== SETUP SERVICES ==========----------*/

  initFanAccessory() {
    // generate uuid
    this.UUID = Homebridge.hap.uuid.generate(this.token + this.ip);

    // prepare the fan accessory
    this.fanAccesory = new Accessory(this.name, this.UUID, Homebridge.hap.Accessory.Categories.FAN);

    // prepare accessory services
    this.setupAccessoryServices();

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.fanAccesory]);
  }

  setupAccessoryServices() {
    // update the services
    this.updateInformationService();

    // prepare the fan service
    this.prepareFanService();

    // additional services
    this.prepareMoveControl();
    this.prepareBuzzerControlService();
    this.prepareLedControlService();
    this.prepareNaturalModeButtonService();
    this.prepareShutdownTimerService();
    this.prepareAngleButtonsService();
  }

  updateInformationService() {
    // remove the preconstructed information service, since i will be adding my own
    this.fanAccesory.removeService(this.fanAccesory.getService(Service.AccessoryInformation));

    let fanModel = this.fanDevice ? this.fanDevice.getFanModel() : 'Unknown';
    let fanDeviceId = this.fanDevice ? this.fanDevice.getDeviceId() : 'Unknown';

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
      .addCharacteristic(Characteristic.RotationDirection) // used to switch between buzzer levels
      .on('get', this.getRotationDirection.bind(this))
      .on('set', this.setRotationDirection.bind(this));

    this.fanAccesory.addService(this.fanService);
  }

  prepareMoveControl() {
    if (this.moveControl) {
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
  }

  prepareBuzzerControlService() {
    if (this.buzzerControl) {
      this.buzzerService = new Service.Switch(this.name + ' Buzzer', 'buzzerService');
      this.buzzerService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getBuzzer.bind(this))
        .on('set', this.setBuzzer.bind(this));

      this.fanAccesory.addService(this.buzzerService);
    }
  }

  prepareLedControlService() {
    if (this.ledControl) {
      this.ledService = new Service.Switch(this.name + ' LED', 'ledService');
      this.ledService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getLed.bind(this))
        .on('set', this.setLed.bind(this));

      this.fanAccesory.addService(this.ledService);
    }
  }

  prepareNaturalModeButtonService() {
    if (this.naturalModeButton) {
      this.naturalModeButtonService = new Service.Switch(this.name + ' Natural mode', 'naturalModeButtonService');
      this.naturalModeButtonService
        .getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.getNaturalMode(callback);
        })
        .on('set', (state, callback) => {
          this.setNaturalMode(state, callback);
        });

      this.fanAccesory.addService(this.naturalModeButtonService);
    }
  }

  prepareShutdownTimerService() {
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

      this.fanAccesory.addService(this.shutdownTimerService);
    }
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

      this.fanAccesory.addService(tmpAngleButton);
      this.angleButtonsService.push(tmpAngleButton);
    });
  }

  renameNaturalModeButtonToSleepMode() {
    if (this.naturalModeButtonService) {
      this.naturalModeButtonService.getCharacteristic(Characteristic.Name).updateValue(this.name + ' Sleep mode');
    }
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
      this.updateAngleButtonsAndSwingMode(null, isSwingModeActive); // update the angel buttons if enabled
      callback();
    } else {
      callback(this.createError(`cannot set swing mode state`));
    }
  }

  getRotationDirection(callback) {
    let buzzerLevel = 2;
    if (this.fanDevice) {
      buzzerLevel = this.fanDevice.getBuzzerLevel();
    }
    callback(null, buzzerLevel === 1 ? Characteristic.RotationDirection.CLOCKWISE : Characteristic.RotationDirection.COUNTER_CLOCKWISE);
  }

  setRotationDirection(state, callback) {
    if (this.fanDevice) {
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
    if (this.fanDevice) {
      if (direction === 'left') {
        this.fanDevice.moveLeft();
      } else {
        this.fanDevice.moveRight();
      }
      setTimeout(() => {
        if (this.moveLeftService) this.moveLeftService.getCharacteristic(Characteristic.On).updateValue(false);
        if (this.moveRightService) this.moveRightService.getCharacteristic(Characteristic.On).updateValue(false);
      }, 20);
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

  getNaturalMode(callback) {
    if (this.fanDevice) {
      callback(null, this.fanDevice.isNaturalModeEnabled());
      return;
    }
    callback(null, false);
  }

  setNaturalMode(state, callback) {
    if (this.fanDevice) {
      this.fanDevice.setNaturalModeEnabled(state);
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
      if (this.fanDevice.isSwingModeEnabled() === true) {
        angleButtonEnabled = this.fanDevice.getAngle() === angle;
      }
    }
    callback(null, angleButtonEnabled);
  }

  setAngleButtonState(state, callback, angle) {
    if (this.fanDevice) {
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


  /*----------========== HELPERS ==========----------*/

  updateFanStatus() {
    if (this.fanDevice) {
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.Active).updateValue(this.fanDevice.isPowerOn() ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.fanDevice.getRotationSpeed());
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.LockPhysicalControls).updateValue(this.fanDevice.isChildLockActive() ? Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED : Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationDirection).updateValue(this.fanDevice.getBuzzerLevel() === 1 ? Characteristic.RotationDirection.CLOCKWISE : Characteristic.RotationDirection.COUNTER_CLOCKWISE);
      if (this.buzzerService) this.buzzerService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isBuzzerEnabled());
      if (this.ledService) this.ledService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isLedEnabled());
      if (this.naturalModeButtonService) this.naturalModeButtonService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isNaturalModeEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.On).updateValue(this.fanDevice.isShutdownTimerEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.Brightness).updateValue(this.fanDevice.getShutdownTimer());
      this.updateAngleButtonsAndSwingMode(null, this.fanDevice.isSwingModeEnabled());
    }
  }

  updateAngleButtonsAndSwingMode(activeAngle, enabled) {
    if (this.fanService) this.fanService.getCharacteristic(Characteristic.SwingMode).updateValue(enabled ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED);
    if (this.angleButtonsService) {
      // if swing mode disabled then just disable all the angle switches
      if (enabled === false) {
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

  createError(msg) {
    return new Error(`[${this.name}] Fan is not connected, ` + msg);
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

  // --------------------------- CUSTOM METHODS ---------------------------

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
