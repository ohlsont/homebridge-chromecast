var Client                = require('castv2-client').Client;
var Application           = require('castv2-client').Application;
var mdns                  = require('mdns');

var browser = mdns.createBrowser(mdns.tcp('googlecast'));

browser.on('serviceUp', function(service) {
  console.log('found device "%s" at %s:%d', service.name, service.addresses[0], service.port);
  console.dir(service.txtRecord);
  console.log(service.txtRecord.md);
  ondeviceup(service.addresses[0]);
  browser.stop();
});

browser.start();

function ondeviceup(host) {

  var client = new Client();

  console.log('CONNECTING..')

  client.connect(host, function() {
    console.log('connected, setting volume ...');
    client.setVolume({ level: 0.1, muted: false }, (e, vol) => {
      console.log(e);
      console.log(vol);
      client.close();
    });

    //avbryt uppspelning helt
    //client2.receiver.getSessions((e, status) => console.log(status))
    //client2.receiver.stop('3885CD9A-8DBB-4E44-9B39-10BC74CB38A7', () => {})

    /*client2.join({ appId: 'CC32E753',
        displayName: 'Spotify',
        isIdleScreen: false,
        namespaces: [ { name: 'urn:x-cast:com.google.cast.media' },
      { name: 'urn:x-cast:com.spotify.chromecast.secure.v1' },
      { name: 'urn:x-cast:com.google.cast.inject' } ],
        sessionId: 'BD5B4AB5-E826-47CB-B5C4-B73B56C94235',
        statusText: 'Spotify',
        transportId: 'web-2' }, DefaultMediaReceiver, (e, app) => myApp = app)*/

      //myApp.pause /play 
  });

  client.on('error', function(err) {
    console.log('Error: %s', err.message);
    client.close();
  });
};
