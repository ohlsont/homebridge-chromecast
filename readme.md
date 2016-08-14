homebridge-plugin-chromecast
====================

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
