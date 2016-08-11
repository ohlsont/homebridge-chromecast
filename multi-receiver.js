const util = require('util'),
      Application = require('castv2-client').Application;

function MultiReceiver(client, session) {
  console.log('PREINIT');
  Application.apply(this, arguments);
  console.log('POSTINIT');

  /*this.media = this.createController(MediaController);

  this.media.on('status', onstatus);*/

  var self = this;

  function onstatus(status) {
    self.emit('status', status);
  }

}

MultiReceiver.APP_ID = 'CC1AD845';

util.inherits(MultiReceiver, Application);

/*MultiReceiver.prototype.getStatus = function(callback) {
  this.media.getStatus.apply(this.media, arguments);
};

MultiReceiver.prototype.load = function(media, options, callback) {
  this.media.load.apply(this.media, arguments);
};

MultiReceiver.prototype.play = function(callback) {
  this.media.play.apply(this.media, arguments);
};

MultiReceiver.prototype.pause = function(callback) {
  this.media.pause.apply(this.media, arguments);
};

MultiReceiver.prototype.stop = function(callback) {
  this.media.stop.apply(this.media, arguments);
};

MultiReceiver.prototype.seek = function(currentTime, callback) {
  this.media.seek.apply(this.media, arguments);
};*/

module.exports = MultiReceiver;
