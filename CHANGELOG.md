# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


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
