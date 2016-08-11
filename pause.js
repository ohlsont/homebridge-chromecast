var Client                = require('castv2-client').Client;
var Application           = require('castv2-client').Application;
var DefaultMediaReceiver           = require('castv2-client').DefaultMediaReceiver;
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
    client.receiver.getSessions((e, sessions) => {
      if(sessions.length > 0){
        client.join(sessions[0], DefaultMediaReceiver, (e, app) => {
          app.getStatus(() => {
            app.play(() => client.close());
          });
        });
      }

    });
  });

  client.on('error', function(err) {
    console.log('Error: %s', err.message);
    client.close();
  });
};
