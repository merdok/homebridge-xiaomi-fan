# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.8] - 2022-05-30
### Added
- Added support for dmaker.fan.p30 (Xiaomi Smart Standing Fan 2) fan
- Added support for dmaker.fan.p33 (Xiaomi Smart Standing Fan 2 Pro) fan
- Added some extra logging output


## [1.5.7] - 2021-08-03
### Added
- Added support for the air.fan.ca23ad9 (AIRMATE CA23-AD9 Air Circulation Fan) fan


## [1.5.6] - 2021-07-27
### Fixed
- Fix characteristic warnings


## [1.5.5] - 2021-07-13
### Added
- Added support for the dmaker.fan.p18 (Mi Smart Fan 2) fan


## [1.5.4] - 2021-07-11
### Fixed
- Fix an issue where the fan woudl report no response in some cases

### Changed
- Adjusted the dmaker.fan.p5 angle range to 0-140


## [1.5.3] - 2021-06-18
### Fixed
- Fix more characteristic warnings

### Changed
- The generated accessory uuid will now be more unique, this might cause existing accessories to reset


## [1.5.2] - 2021-06-17
### Fixed
- Fix characteristic warnings


## [1.5.1] - 2021-06-08
### Fixed
- Fix an error which might appear when syncing fan properties


## [1.5.0] - 2021-05-20
### Added
- Added support for the zhimi.fan.fb1 (Mi Smart Air Circulator Fan) fan
- New `verticalAngleButtons` property
- Added a reference to a tool in the readme for easy token retrieval

### Changed
- Improved the naming of services to make them more readable (no need to repeat the fan name on each service)


## [1.4.8] - 2021-03-13
### Fixed
- Fixed homebridge warning after recent update


## [1.4.7] - 2020-12-28
### Added
- Added support for the zhimi.fan.fa1 (Mijia DC Circulating Fan)
- New capabilities
- Show Up/Down move control when the fan supports it


## [1.4.6] - 2020-12-07
### Added
- Added support for the dmaker.fan.p8 (Mi Smart Standing Fan 1C CN)

### Fixed
- Fixed step less fan speed control on the Mi Smart Standing Fan Pro


## [1.4.5] - 2020-12-07
### Changed
- Remove the fan speed capability from dmaker.fan.p11 and dmaker.fan.p15 as it is not clear yet how to control it on those fan models


## [1.4.4] - 2020-12-06
### Added
- Added support for the dmaker.fan.p11 (Mi Smart Standing Fan Pro)
- Added support for the dmaker.fan.p15 (Mi Smart Standing Fan Pro EU)


## [1.4.3] - 2020-10-07
### Fixed
- Fixed a bug where disabling the predefined angleButtons would not have any effect

### Changed
- The angleButtons state will now be disabled when the fan is turned off
- Updated README to clarify a property more


## [1.4.2] - 2020-10-04
### Added
- new `deepDebugLog` property which enables more detailed debug log
- some under the hood improvements

### Fixed
- Fixed config.schema.json

### Removed
- Removed the battery reporting capability from Smartmi Fan 3 as it seems that it is not supported by the fan


## [1.4.1] - 2020-10-03
### Fixed
- Fixed a bug where the plugin would not have a stable connection to miot devices
- Fixed config.schema.json


## [1.4.0] - 2020-10-02

This update brings a lot of new changes and improvements. After the update the fan will be re-added to your Home app.
New devices will now appear in the Home app automatically after the first connection has been established since the plugin needs to identify the fan model in order to create a device specific fan accessory.
That means no new accessory will appear in HomeKit until the first successful connection. If you know your fan model then you can specify that in the config.json to speed up the discovery.

### Added
- Automatic device detection and device specific accessories
- On supported devices temperature and humidity will now be shown
- On supported devices the battery level will now be shown
- "No response" will now be shown on the fan accessory if the fan is not connected
- Show correct status of switches when the fan is not connected (switches got stuck at the last known status before)
- Miio devices now support fan levels
- dmaker.fan.p9 now supports sleep mode control
- If a fan supports led brightness (0% to 100%) then show a lightbulb
- New `model` property which allows to specify the fan model for faster accessory creation
- New `sleepModeControl` property which allows to enable/disable the sleep mode. Only on supported devices!
- New `ioniserControl` property which allows to quickly enable/disable the ioniser on your fan. Only on supported devices!
- New `fanLevelControl` property which when enabled will show predefined buttons to easily switch fan levels. Only on supported devices!

### Fixed
- Reduced the number of commands send to the fan when setting rotation speed using the speed slider
- Fixed a bug where it was not possible to set rotation speed and control natural mode at the same time in scenes

### Changed
- The plugin now works as a dynamic platform which means that there is no need to manually add devices to HomeKit anymore
- Only supported services by the fan will now appear on fan accessories and enabling services in the config.json will only have effect when the fan supports it
- Renamed `naturalModeButton` property to `naturalModeControl` to be consistent with other properties (breaking change for some users)
- Check if angle buttons are within the supported range by the fan
- Reorganized project structure
- Fixed some typos in the README

### Removed
- Removed the possibility to setup the plugin as an accessory (breaking change for some users)


## [1.3.1] - 2020-07-30
### Added
- Added support for zhimi.fan.v2 and zhimi.fan.v3 (Smartmi DC Pedestal Fan) fans

### Fixed
- Fixed a bug with the miot protocol which prevented property polling

### Changed
- Updated README


## [1.3.0] - 2020-07-29
### Added
- You can now configure this plugin to run as a platform
- Added a fan device factory to detect which fan is used
- Added support for the dmaker.fan.p9 fan (Mijia Tower Fan)
- Added support for the dmaker.fan.p10 fan (Mijia 2-in-1 DC Inverter Fan 2)
- Added support for the zhimi.fan.za5 fan (Smartmi Standing Fan 3)
- Added generic miot fan
- Added fan capabilities to easily distinguish what features fan models support

### Changed
- Platform is now also the preferred way to use the plugin, when still using as an accessory a warning will be shown.
- Optimized miot protocol
- Optimized code
- Reorganized project structure
- Updated README

Note: All users should switch to use the plugin as a platform since the accessory way will be removed soon. In order to switch to platform you just simply need to adjust your config.json as the example in the README.


## [1.2.1] - 2020-07-26
### Changed
- Fixed dmaker.fan.p5 support


## [1.2.0] - 2020-07-26
### Added
- Added support for the dmaker.fan.1c
- Other new xiaomi fans should also now have initial support
- New miotFan device class which adds initial support for xiaomi miot protocol fans
- New optional deviceId configuration field

### Changed
- Optimized code to easily implement new xiaomi miot fans
- Improved log
- Updated README

Note: The dmaker.fan.1c does not support `moveControl` (move left/right) and `angleButtons`.
Since `moveControl` is automatically enabled this needs to be currently manually disabled in the config.json. Just set `moveControl` to false if you are using this device.


## [1.1.4] - 2020-07-15
### Changed
- Improved log
- Updated README


## [1.1.3] - 2020-07-13
### Added
- Smartmi fans will now log the total use time in minutes when connected to the device

### Changed
- Added back the rotation direction service, the switch can now be used on Smartmi fans to switch between buzzer sound level (loud or quiet)
- Updated README


## [1.1.2] - 2020-07-12
### Changed
- Updated README
- Updated config.schema.json


## [1.1.1] - 2020-07-12
### Changed
- the `naturalModeButton` configuration field has now a default value of `true`

### Removed
- Removed the rotation service which was used to toggle between fan modes, now replaced by a dedicated switch


## [1.1.0] - 2020-07-12
### Changed
- Renamed `modeButtons` configuration field to `naturalModeButton`
- the new `naturalModeButton` configuration field now creates just one switch which enables/disabled the natural mode
- fixed the status of the rotation direction button(natural mode)
- turning off an active angle button will now disable oscillation
- turning on an angle button will now enable oscillation


## [1.0.2] - 2020-07-08
### Changed
- Fixed a possible crash


## [1.0.1] - 2020-07-08
### Added
- Added missing move control to dmaker fans which was by mistake removed with version 1.0.0

### Changed
- Updated README
- `moveControl` configuration field has now back a default value of `true`


## [1.0.0] - 2020-07-06
### Added
- Huge update update!
- New `modeButtons` configuration field, which allows to show additional fan mode switch buttons
- New `shutdownTimer` configuration field, which allows to enable a slider which can be used to set a shutdown timer
- New `angleButtons` configuration field, which allows to create buttons that can be used to switch between oscillation angles
- Home automations should now work
- Adding new devices should not be more easier

### Changed
- The plugin was completely rewritten which should result in better status detection and more reliable controls.
- `moveControl` configuration field has now a default value of `false`
- Better logging
- Fan status is now not dependant on a successful ping anymore
- Updated README

### Removed
- Removed unused dependencies
- Removed unnecessary checks


## [0.9.5] - 2020-06-29
### Changed
- Reset fan status after connection loss. When the fan was turned off manually then the Home fan status got stuck on the last reported state by the fan.


## [0.9.4] - 2020-06-28
### Changed
- Changed default preferences directory

### Removed
- Removed unused dependency


## [0.9.3] - 2020-06-28
### Added
- Added missing dmaker.fan.p5 properties

### Changed
- Optimized code


## [0.9.2] - 2020-06-25
### Added
- Initial dmaker fan support

### Changed
- Fixed some typos
- Optimized error handling


## [0.9.1] - 2020-06-19
### Fixed
- Fixed a bug which might have caused a crash in some cases


## [0.9.0] - 2020-06-14
### Added
- Better device status retrieval. Requesting the device status should not longer make other accessories unresponsive.

### Changed
- Fixed a bug which might have caused a crash when setting the speed level


## [0.8.1] - 2019-08-13
### Fixed
- Fixed a bug where optional switches could not be disabled


## [0.8.0] - 2019-08-04
### Initial release
