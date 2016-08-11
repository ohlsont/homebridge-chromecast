const Client = require('castv2-client').Client,
      DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver,
      Promise = require('bluebird');

function connect(chromecast){
  console.log('Connecting to ' + chromecast.name);

  const host = chromecast.addresses[0],
        client = Promise.promisifyAll(new Client());

  return client.connectAsync(host)
    .then(() => client);
}

function join(client){
  console.log('Joining app..');
  return client.getSessionsAsync()
    .then(sessions => console.log(sessions) || sessions.length > 0
      ? client.joinAsync(sessions[0], DefaultMediaReceiver).then(Promise.promisifyAll)
      : client.closeAsync().then(() => Promise.reject(new Error('No session to join..')))
    );
}

function pause(chromecast){
  console.log('Pausing on ' + chromecast.name);
  return connect(chromecast)
    .then(client => join(client)
      .then(app => app.getStatusAsync()
        .then(status => app.pauseAsync()
          .then(() => {
            chromecast.currentStatus = status;
            return client.closeAsync().then(() => status);
          })
        )
      )
    );
}

function play(chromecast){
  console.log('Playing on ' + chromecast.name);
  return connect(chromecast)
    .then(client =>
      join(client)
        .then(app => app.getStatusAsync()
          .then(status => app.playAsync()
            .then(() => {
              chromecast.currentStatus = status;
              return client.closeAsync().then(() => status);
            })
          )
        )
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
        return client.closeAsync();
      })
    );
}

function getVolume(chromecast){
  console.log('Getting volume from ' + chromecast.name);
  return connect(chromecast)
    .then(client => client.getVolumeAsync()
      .then(volume => {
        if(chromecast.currentStatus){
          chromecast.currentStatus.volume.level = volume.level;
        }
        return client.closeAsync().then(() => volume.level);
      })
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
    .then(client => join(client)
      .then(app => app.getStatusAsync())
      .then(status => console.log(status) || status)
      .then(status => {
        client.close();
        chromecast.currentStatus = status;
        return status;
      })
    )
}

module.exports = {
  getVolume: getVolume,
  setVolume: setVolume,
  getStatus: getStatus,
  pause: pause,
  play: play
}
