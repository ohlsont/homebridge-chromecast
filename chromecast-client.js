const Client = require('castv2-client').Client,
      DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver,
      Promise = require('bluebird'),
      MultiReceiver = require('./multi-receiver.js');

const connections = {};

function isGroup(chromecast){
  return chromecast.txtRecord.md === 'Google Cast Group';
}

function connect(chromecast){
  console.log('Connecting to ' + chromecast.name);

  const host = chromecast.addresses[0],
        client = Promise.promisifyAll(new Client());

  if(connections[chromecast.name]){
    return Promise.resolve(connections[chromecast.name]);
  }

  /*
  oogle.cast.receiver data={"requestId":9,"status":{"applications":[{"appId":"MultizoneLeader","displayName":"Spotify","isIdleScreen":false,"sessionId":"34F16C8A-89FF-401C-829F-E1CD3472CBC8","statusText":"Spotify"}],"volume":{"controlType":"attenuation","level":0.027450980618596077,"muted":false,"stepInterval":0.05000000074505806}},"type":"RECEIVER_STATUS"} +5ms
  */

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

function join(client, chromecast){
  console.log('Joining app..');
  console.log(chromecast);
  return client.getSessionsAsync()
    .then(sessions => (chromecast.sessions = sessions) && sessions)
    .then(sessions => sessions.length > 0
      ? client.joinAsync(sessions[0], /*chromecast.txtRecord.md === 'Google Cast Group' ? MultiReceiver : */DefaultMediaReceiver).then(Promise.promisifyAll)
      : Promise.reject('No session to join..')
    )
}

function pause(chromecast){
  console.log('Pausing on ' + chromecast.name);
  return connect(chromecast)
    .then(client => join(client, chromecast)
      .then(app => console.log(app) || app.getStatusAsync()
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

/*
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
*/

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
  pause: pause,
  play: play
}
