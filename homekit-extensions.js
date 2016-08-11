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

const UUID2 = '00000008-0000-1000-8000-0026BB765297';
const NowPlaying = function() {
  const char = new Characteristic('Now Playing', UUID2);
  char.setProps({
    format: Characteristic.Formats.STRING,
    perms: [Characteristic.Perms.READ]
  });
  char.value = char.getDefaultValue();
  return char;
};
NowPlaying.UUID = UUID2;

module.exports = {
  Characteristic: {
    Volume: Volume,
    NowPlaying: NowPlaying
  }
}
