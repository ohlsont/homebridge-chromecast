/* @flow weak */

const Client = require('castv2-client').Client,
      DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver,
      Promise = require('bluebird');

const EventEmitter = require('events');

class Chromecast extends EventEmitter{
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

    if(!oldVolume || oldVolume.muted !== this.volume.muted){
      this.emit('isMuted', this.volume.muted);
    }

    if(!oldApplication || oldApplication.statusId !== this.currentApplication.statusId){
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
/*

const connections = {};



function connect(chromecast){
  console.log('Connecting to ' + chromecast.name);

  const host = chromecast.addresses[0],
        client = Promise.promisifyAll(new Client());

  if(connections[chromecast.name]){
    return Promise.resolve(connections[chromecast.name]);
  }


  oogle.cast.receiver data={"requestId":9,"status":{"applications":[{"appId":"MultizoneLeader","displayName":"Spotify","isIdleScreen":false,"sessionId":"34F16C8A-89FF-401C-829F-E1CD3472CBC8","statusText":"Spotify"}],"volume":{"controlType":"attenuation","level":0.027450980618596077,"muted":false,"stepInterval":0.05000000074505806}},"type":"RECEIVER_STATUS"} +5ms


  return client.connectAsync(isGroup(chromecast) ? { host: host, port: chromecast.port } : host)
    .then(() => {
      connections[chromecast.name] = client;
      return client;
    });
}

const handleSuccess = (client) =>
  data => {
    //client.close();
    return data;
  }

const handleError = (client) =>
  error => {
    //client.close();
    return Promise.reject(new Error(error));
  };

function getSessions(chromecast){
  return connect(chromecast)
    .then(client => client.getSessionsAsync())
    .then(sessions => (chromecast.sessions = sessions) && sessions)
}

function join(client, chromecast){
  console.log('Joining app..');
  console.log(chromecast);
  return client.getSessionsAsync()
    .then(sessions => (chromecast.sessions = sessions) && sessions)
    .then(sessions => sessions.length > 0
      ? client.joinAsync(sessions[0], chromecast.txtRecord.md === 'Google Cast Group' ? MultiReceiver : DefaultMediaReceiver).then(Promise.promisifyAll)
      : Promise.reject('No session to join..')
    )
}

function pause(chromecast){
  console.log('Pausing on ' + chromecast.name);
  return connect(chromecast)
    .then(client => join(client, chromecast)
      .then(app => app.getStatusAsync()
        .then(status => app.pauseAsync()
          .then(() => {
            chromecast.currentStatus = status;
            return status; //todo: playing status will not be in sync
          })
        )
      )
      .then(handleSuccess(client), handleError(client))
    )
}

function play(chromecast){
  console.log('Playing on ' + chromecast.name);
  return connect(chromecast)
    .then(client => join(client, chromecast)
      .then(app => app.getStatusAsync()
        .then(status => app.playAsync()
          .then(() => {
            chromecast.currentStatus = status; //todo: playing status will not be in sync
            return status;
          })
        )
      )
      .then(handleSuccess(client), handleError(client))
    );
  }

function setVolume(chromecast, volume){
  console.log('Setting volume for ' + chromecast.name + ' to ' + volume);
  return connect(chromecast)
    .then(client => client.setVolumeAsync({ level: volume / 100 })
      .then(() => {
        if(chromecast.currentStatus){
          chromecast.currentStatus.volume.level = volume / 100;
        }
      })
      .then(handleSuccess(client), handleError(client))
    );
}

function getVolume(chromecast){
  console.log('Getting volume from ' + chromecast.name);
  return connect(chromecast)
    .then(client => client.getVolumeAsync()
      .then(volume => {
        console.log(volume);
        if(chromecast.currentStatus){
          chromecast.currentStatus.volume.level = volume.level;
        }
        return volume.level;
      })
      .then(handleSuccess(client), handleError(client))
    );
}

function monitor(chromecast){
  return connect(chromecast)
    .then(client => {
      client.on('status', status => console.log('CLIENT GOT STATUS: ' + JSON.stringify(status)));
      return join(client, chromecast);
    })
    .then(app => {
      app.on('status', status => console.log('APP GOT STATUS: ' + JSON.stringify(status)))
    });
}


{ mediaSessionId: 32,
  playbackRate: 1,
  playerState: 'PLAYING',
  currentTime: 50.816,
  supportedMediaCommands: 15,
  volume: { level: 1, muted: false },
  media:
   { contentId: 'spotify:track:4y6vJ7A05wBeGPHWWZCUzO',
     contentType: 'application/x-spotify.track',
     streamType: 'BUFFERED',
     duration: 257.786,
     metadata:
      { metadataType: 3,
        title: 'Jitter - SNBRN Remix',
        songName: 'Jitter - SNBRN Remix',
        artist: 'Grace Mitchell',
        albumName: 'Jitter (SNBRN Remix)',
        images: [Object] } },
  currentItemId: 32,
  items: [ { itemId: 32, media: [Object], autoplay: false, customData: null } ],
  repeatMode: 'REPEAT_OFF' }


function getStatus(chromecast){
  return connect(chromecast)
    .then(client => join(client, chromecast)
      .then(app => app.getStatusAsync())
      .then(status => console.log(status) || status)
      .then(status => {
        chromecast.currentStatus = status;
        return status;
      })
      .then(handleSuccess(client), handleError(client))
    )
}

module.exports = {
  getVolume: getVolume,
  setVolume: setVolume,
  getStatus: getStatus,
  getSessions: getSessions,
  pause: pause,
  play: play,
  monitor: monitor
}
*/
