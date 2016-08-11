const Characteristic = require('hap-nodejs').Characteristic;

const UUID = '00000008-0000-1000-8000-0026BB765296';
const Volume = function() {
  const char = new Characteristic('Volume', UUID);
  char.setProps({
    format: Characteristic.Formats.INT,
    unit: Characteristic.Units.PERCENTAGE,
    maxValue: 100,
    minValue: 0,
    minStep: 1,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });
  char.value = char.getDefaultValue();
  return char;
};
Volume.UUID = UUID;

const NowPlayingUUID = '00000008-0000-1000-8000-0026BB765297';
const NowPlaying = function() {
  const char = new Characteristic('Now Playing', NowPlayingUUID);

  char.setProps({
    format: Characteristic.Formats.STRING,
    perms: [Characteristic.Perms.READ]
  });
  char.value = char.getDefaultValue();
  return char;
};
NowPlaying.UUID = NowPlayingUUID;

const PlayingUUID = '00000008-0000-1000-8000-0026BB765298';
const Playing = function() {
  const char = new Characteristic('Playing', PlayingUUID);
  char.setProps({
    format: Characteristic.Formats.BOOL,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });
  char.value = char.getDefaultValue();
  return char;
};
Playing.UUID = PlayingUUID;

const MediaControllerUUID = '00000008-0000-1000-8000-0026BB765299';
const MediaController = function(displayName, subtype) {
  const char = new Service(displayName, MediaControllerUUID, subtype);

  char.addCharacteristic(NowPlaying);
  char.addCharacteristic(Playing);

  return char;
};
MediaController.UUID = MediaControllerUUID;

module.exports = {
  Characteristic: {
    Volume: Volume,
    NowPlaying: NowPlaying,
    Playing: Playing
  },
  Service: {
    MediaController: MediaController
  }
}
