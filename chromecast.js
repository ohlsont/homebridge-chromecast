/* @flow weak */

const Client = require('castv2-client').Client,
      DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver,
      Promise = require('bluebird'),
      mdns = require('mdns');

const Events = require('events');

class Chromecast extends Events
{
  constructor(chromecastConfig){
    super();
    console.log('Connecting to ' + chromecastConfig.name);

    this.chromecastConfig = chromecastConfig;
    this.isConnected = false;
    this.applications = [];

    this.connect();
  }

  isGroup(){
    return this.chromecastConfig.txtRecord.md === 'Google Cast Group';
  }

  static scan(cb){
    const sequence = [
        mdns.rst.DNSServiceResolve(),
        'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families:[0]}),
        mdns.rst.makeAddressesUnique()
    ];

    const browser = mdns.createBrowser(mdns.tcp('googlecast'), { resolverSequence: sequence });

    browser.on('serviceUp', chromecastConfig => {
      console.log('Added Chromecast "%s" at %s:%d', chromecastConfig.name, chromecastConfig.addresses[0], chromecastConfig.port);

      const chromecast = new Chromecast(chromecastConfig);

      cb(chromecast);
    });

    browser.start();
  }

  connect(){
    const host = this.chromecastConfig.host,
          port = this.chromecastConfig.port;

    this.client = Promise.promisifyAll(new Client());

    return this.client
      .connectAsync({
        host: host,
        port: port
      })
      .then(() => {
        this.client.on('status', status => this.onClientStatus(status));
        this.client.on('error', this.onClientError);
        this.client.connection.on('disconnect', this.onConnectionDisconnect);
        this.client.heartbeat.on('timeout', this.onHeartbeatTimeout);
        this.client.heartbeat.on('pong', this.onHeartbeatPong);
        this.client.receiver.on('status', this.onReceiverStatus);
        return this.client.getStatusAsync();
      })
      .then(status => this.onClientStatus(status));
  }

  get isPlaying() {
    return this.media && this.media.status && (this.media.status.playerState === 'PLAYING' || this.media.status.playerState === 'BUFFERING') ? true : false;
  }

  get isMuted() {
    return this.volume && this.volume.muted ? true : false;
  }

  disconnect(){
    this.isConnected = false;
    if(this.client && this.client.closeAsync){
      this.client.closeAsync();
    }
  }

  onClientStatus(status){
    console.log('CLIENT GOT STATUS: \n' + JSON.stringify(status));

    const oldApplication = this.currentApplication,
          oldVolume = this.volume;

    this.volume = status.volume;
    this.applications = status.applications;
    this.currentApplication = this.applications && this.applications.length > 0
      ? this.applications[0]
      : null;

    if(!oldVolume || !this.volume || oldVolume.muted !== this.volume.muted){
      this.emit('isMuted', this.volume.muted);
    }

    if(!oldApplication || !this.currentApplication || oldApplication.statusId !== this.currentApplication.statusId){
      this.emit('currentApplication', this.currentApplication);
    }

    if(this.currentApplication){
      if(!this.media || !oldApplication || this.currentApplication.statusId !== oldApplication.statusId){
        return this.client
          .joinAsync(this.currentApplication, DefaultMediaReceiver)
          .then(Promise.promisifyAll)
          .then(media => this.media = media)
          .then(media => {
            this.media.on('status', status => this.onMediaStatus(status));
            return this.media.getStatusAsync();
          })
          .then(status => this.onMediaStatus(status));
      }
    }
    else{
      this.media = null;
    }
    if(oldVolume !== this.volume){
      this.emit('volume', this.volume);
    }
    return Promise.resolve();
  }

  pause(){
    return this.media
      ? this.media.pauseAsync()
      : Promise.resolve();
  }

  play(){
    return this.media
      ? this.media.playAsync()
      : Promise.resolve();
  }

  stop(){
    return this.media
      ? this.media.stopAsync()
      : Promise.resolve();
  }

  load(media, options){
    return this.media
      ? this.media.loadAsync(media, options)
      : Promise.resolve();
  }

  seek(time){
    return this.media
      ? this.media.seekAsync(time)
      : Promise.resolve();
  }

  onClientError(error){
    console.log('CLIENT GOT ERROR: \n' + JSON.stringify(error));
  }
  /*
  self.connection = self.createController(ConnectionController);
    self.heartbeat  = self.createController(HeartbeatController);
    self.receiver   = self.createController(ReceiverController);*/
  onConnectionDisconnect(){
    console.log('CONNECTION GOT DISCONNECT');
    this.isConnected = false;
  }

  onHeartbeatTimeout(){
    console.log('GOT HEARTBEAT TIMEOUT');
  }

  onHeartbeatPong(){
    console.log('GOT HEARTBEAT PONG');
  }

  onReceiverStatus(status){
    console.log('RECEIVER STATUS:\n' + JSON.stringify(status));
    //SAME AS CLIENT STATUS?
  }

  setVolume(volume){
    const decimalVolume = volume / 100;
    return this.client.setVolumeAsync({ level: decimalVolume })
      .then(() => {
        if(this.volume){
          this.volume.level = decimalVolume;
        }
      })
      .then(() => decimalVolume);
  }

  setMuted(isMuted){
    return this.client.setVolumeAsync({ muted: isMuted })
      .then(() => {
        if(this.volume){
          this.volume.muted = isMuted;
        }
      })
      .then(() => isMuted);
  }

  onMediaStatus(status){
    const previousIsPlaying = this.isPlaying;
    console.log('MEDIA STATUS:\n' + JSON.stringify(status));
    if(this.media){
      this.media.status = status;
    }
    if(previousIsPlaying !== this.isPlaying){
      this.emit('isPlaying', this.isPlaying);
    }
  }
}

module.exports = Chromecast;
