<span align="center">

# homebridge-xiaomi-fan

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins#verified-plugins)
[![homebridge-xiaomi-fan](https://badgen.net/npm/v/homebridge-xiaomi-fan?icon=npm)](https://www.npmjs.com/package/homebridge-xiaomi-fan)
[![mit-license](https://badgen.net/npm/license/lodash)](https://github.com/merdok/homebridge-webos-tv/blob/master/LICENSE)
[![follow-me-on-twitter](https://badgen.net/twitter/follow/merdok_dev?icon=twitter)](https://twitter.com/merdok_dev)

</span>

`homebridge-xiaomi-fan` is a plugin for homebridge which allows you to control Xiaomi Smartmi and Mija Fans! It should work with most smart fans from xiaomi.
The goal is to make the fan fully controllable from the native Homekit iOS app and Siri.

### Features
* Integrates into homekit as a fan device
* Control power, speed, swing mode and switch between standard and natural wind
* Set oscillation angle
* Rotate fan to the left or right by 5°
* Turn on/off the buzzer
* Turn on/off the LEDs
* Set a shutdown timer
* Homekit automations

### Known supported fan models
* zhimi.fan.sa1 (Mijia DC Inverter Fan)
* zhimi.fan.za1 (Smartmi Fan (2nd gen))
* zhimi.fan.za3 (Smartmi Standing Fan 2)
* zhimi.fan.za4 (Smartmi Standing Fan 2S)
* dmaker.fan.p5 (Mijia Fan 1X)
* dmaker.fan.1c (Mi Smart Standing Fan 1C or Mijia Fan 1C)

Note: The dmaker.fan.1c does not support `moveControl` (move left/right) and `angleButtons`.
Since `moveControl` is automatically enabled this needs to be currently manually disabled in the config.json. Just set `moveControl` to false if you are using this device.

**IMPORTANT:** I plan to switch the plugin from an accessory plugin to a platform plugin in the near future. This will allow me to more easily support all the different fans. When that happens you will need to adjust your `config.json`.

## Installation

If you are new to homebridge, please first read the homebridge [documentation](https://www.npmjs.com/package/homebridge).
If you are running on a Raspberry, you will find a tutorial in the [homebridge wiki](https://github.com/homebridge/homebridge/wiki/Install-Homebridge-on-Raspbian).

Install homebridge:
```sh
sudo npm install -g homebridge
```

Install homebridge-xiaomi-fan:
```sh
sudo npm install -g homebridge-xiaomi-fan
```

## Configuration

Add the accessory in `config.json` in your home directory inside `.homebridge`.

Example configuration:

```js
{
  "accessories": [
    {
      "accessory": "xiaomifan",
      "name": "Xiaomi Fan 2s",
      "ip": "192.168.0.40",
      "token": "8305d8fba83f94bb5ad8f963b6c84c84",
      "pollingInterval": 10,
      "moveControl": true,
      "buzzerControl": true,
      "ledControl": true,
      "naturalModeButton": true,
      "shutdownTimer": true,
      "angleButtons": [
         5,
         60,
         100
       ]
    }
  ]  
}
```

## Token

For the plugin to work the device token is required. For methods on how to find the token refer to this guide [obtaining mi device token](https://github.com/jghaanstra/com.xiaomi-miio/blob/master/docs/obtain_token.md).

### Configuration fields
- `accessory` [required]
Should always be "xiaomifan".
- `name` [required]
Name of your accessory.
- `ip` [required]
ip address of your Fan.
- `token` [required]
The device token of your Fan.
- `prefsDir` [optional]
The directory where the fan device info will be stored. **Default: "~/.homebridge/.xiaomiFan"**
- `pollingInterval` [optional]
The fan state background polling interval in seconds. **Default: 5**
- `moveControl` [optional]
Whether the move service is enabled. This allows to move the fan in 5° to the left or right. Not supported by the dmaker.fan.1c! **Default: true**
- `buzzerControl` [optional]
Whether the buzzer service is enabled. This allows to turn on/off the fan buzzer. On Smartmi fans the rotation direction switch can be used to select between loud or quiet buzzer level. **Default: true**
- `ledControl` [optional]
Whether the led service is enabled. This allows to turn on/off the fan LED. **Default: true**
- `naturalModeButton` [optional]
Show a switch which allows to quickly enable/disable the natural mode. **Default: true**
- `shutdownTimer` [optional]
Show a slider (as light bulb) which allows to set a shutdown timer in minutes. **Default: false**
- `angleButtons` [optional]
Whether the angle buttons service is enabled. This allows to create buttons which can switch between different oscillation angles. Array of values. Possible angles 0-120. Not supported by the dmaker.fan.1c! **Default: "" (disabled)**
- `deviceId` [optional]
New fan devices which use the miot protocol require the device id to be specified. The deviceId will be automatically retrieved by the plugin but if there is trouble you can manually specify it. **Default: "" (not specified)**

## Troubleshooting
If you have any issues with the plugin or fan services then you can run homebridge in debug mode, which will provide some additional information. This might be useful for debugging issues.

Homebridge debug mode:
```sh
homebridge -D
```

## Special thanks
[miio](https://github.com/aholstenson/miio) - the Node.js remote control module for Xiaomi Mi devices.

[HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) & [homebridge](https://github.com/nfarina/homebridge) - for making this possible.
