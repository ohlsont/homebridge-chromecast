homebridge-plugin-chromecast
====================

This is very much a proof-of-concept, and I've noted it's a popular one. I don't have time to pursue this further at this moment - so please feel free to contribute or make your own implementation. The source code is available at [Bitbucket](https://bitbucket.org/robertherber/homebridge-chromecast).

For use with [homebridge](https://github.com/nfarina/homebridge), please follow that guide for setting it all up. Exposes all Chromecasts found on network to Homekit as Switches (as media devices aren't fully supported), with the following Characteristics:

* On/off - For playing/pausing. An app with loaded content is required for this to have effect.
* Audio feedback - For muting/unmuting.
* Now playing - The currently used app in text.
* Brightness - Controls the volume - from 0 to 100.

Use cases (you'll have to set up the triggers in Homekit yourself):

* Dim lights when Chromecast starts playing
* Mute your Chromecast Audios when playing something from your Chromecast Video
* Pause your Chromecast when leaving home.
* "Turn off Videocast" for pausing
* "Set Videocast to 10" to adjust volume to 10%
* Haven't found a way to trigger the "audio feedback" characteristic, please let me know if you do! :)

Configuration
========================
This is an example configuration file:

```
{
    "bridge": {
        "name": "HomebridgeChromecast",
        "username": "CC:22:3D:E3:CE:13",
        "port": 51803,
        "pin": "123-45-677"
        "username": "CC:22:3D:E3:CE:07",
        "port": 51891,
        "pin": "123-45-675"
    },

    "description": "This is an example configuration file with one fake accessory and one fake platform. You can use this as a template for creating your own configuration file containing devices you actually own.",

    "accessories": [

    ],

    "platforms": [
        {
            "platform" : "HomebridgePluginChromecast",
            "name" : "Chromecast"
        }
    ]
}
```
