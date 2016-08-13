const http = require('http'),
      _ = require('lodash'),
      Chromecast = require('./chromecast.js'),
      homekitExtensions = require('./homekit-extensions.js'),
      Promise = require('bluebird'),
      mdns = require('mdns');

let Accessory, Service, Characteristic, UUIDGen;

const browser = mdns.createBrowser(mdns.tcp('googlecast')),
      NowPlaying = homekitExtensions.Characteristic.NowPlaying,
      discoveredChromecasts = {};

module.exports = function(homebridge) {
  console.log('homebridge API version: ' + homebridge.version);

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform('homebridge-chromecast', 'HomebridgeChromecast', HomebridgeChromecast, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function HomebridgeChromecast(log, config, api) {
  log('HomebridgeChromecast Init');
  var platform = this;
  this.log = log;
  this.config = config;
  this.accessories = [];

  this.requestServer = http.createServer(function(request, response) {
    if (request.url === '/add') {
      this.addAccessory(new Date().toISOString());
      response.writeHead(204);
      response.end();
    }

    if (request.url == '/reachability') {
      this.updateAccessoriesReachability();
      response.writeHead(204);
      response.end();
    }

    if (request.url == '/remove') {
      this.removeAccessory();
      response.writeHead(204);
      response.end();
    }
  }.bind(this));

  this.requestServer.listen(18081, function() {
    platform.log('Server Listening...');
  });

  if (api) {
      // Save the API object as plugin needs to register new accessory via this object.
      this.api = api;

      // Listen to event 'didFinishLaunching', this means homebridge already finished loading cached accessories
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories
      this.api.on('didFinishLaunching', function() {
        platform.log('DidFinishLaunching');

        browser.on('serviceUp', chromecastConfig => {
          console.log('Added Chromecast "%s" at %s:%d', chromecastConfig.name, chromecastConfig.addresses[0], chromecastConfig.port);

          const chromecast = new Chromecast(chromecastConfig);

          discoveredChromecasts[chromecastConfig.name] = chromecast;

          const uuid = UUIDGen.generate(chromecastConfig.txtRecord.id);
          if(!_.find(this.accessories, { UUID: uuid })){
            this.addAccessory(chromecastConfig);
          }

          chromecast.on('isPlaying', isPlaying => {
            console.log('isPlaying UPDATED: ' + isPlaying);
            const accessory = _.find(this.accessories, { UUID: uuid });
            accessory.getService(Service.Switch).getCharacteristic(Characteristic.On).setValue(isPlaying);
          });

          chromecast.on('isMuted', isMuted => {
            const accessory = _.find(this.accessories, { UUID: uuid });
            accessory.getService(Service.Switch)
              .getCharacteristic(Characteristic.AudioFeedback)
              .setValue(!isMuted);
          });

          chromecast.on('currentApplication', application => {
            const accessory = _.find(this.accessories, { UUID: uuid });
            accessory.getService(Service.Switch).getCharacteristic(NowPlaying).setValue(application ? application.displayName : '-');
          });

        });

        browser.start();
      }.bind(this));
  }
}

// Function invoked when homebridge tries to restore cached accessory
// Developer can configure accessory at here (like setup event handler)
// Update current value
HomebridgeChromecast.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, 'Configure Accessory');
  var platform = this;

  // set the accessory to reachable if plugin can currently process the accessory
  // otherwise set to false and update the reachability later by invoking
  // accessory.updateReachability()
  accessory.reachable = !!discoveredChromecasts[accessory.displayName];

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, 'Identify!!!');
    callback();
  });

  Object.defineProperty(accessory, 'chromecast', {
    get: () => discoveredChromecasts[accessory.displayName]
  });

  addCharacteristics(accessory);

  this.accessories.push(accessory);

  return accessory;
}

//Handler will be invoked when user try to config your plugin
//Callback can be cached and invoke when nessary
HomebridgeChromecast.prototype.configurationRequestHandler = function(context, request, callback) {
  this.log('Context: ', JSON.stringify(context));
  this.log('Request: ', JSON.stringify(request));

  // Check the request response
  if (request && request.response && request.response.inputs && request.response.inputs.name) {
    this.addAccessory(request.response.inputs.name);

    // Invoke callback with config will let homebridge save the new config into config.json
    // Callback = function(response, type, replace, config)
    // set 'type' to platform if the plugin is trying to modify platforms section
    // set 'replace' to true will let homebridge replace existing config in config.json
    // 'config' is the data platform trying to save
    callback(null, 'platform', true, {'platform':'HomebridgeChromecast', 'otherConfig':'SomeData'});
    return;
  }

  // - UI Type: Input
  // Can be used to request input from user
  // User response can be retrieved from request.response.inputs next time
  // when configurationRequestHandler being invoked

  var respDict = {
    'type': 'Interface',
    'interface': 'input',
    'title': 'Add Accessory',
    'items': [
      {
        'id': 'name',
        'title': 'Name',
        'placeholder': 'Fancy Light'
      }//,
      // {
      //   'id': 'pw',
      //   'title': 'Password',
      //   'secure': true
      // }
    ]
  }

  // - UI Type: List
  // Can be used to ask user to select something from the list
  // User response can be retrieved from request.response.selections next time
  // when configurationRequestHandler being invoked

  // var respDict = {
  //   'type': 'Interface',
  //   'interface': 'list',
  //   'title': 'Select Something',
  //   'allowMultipleSelection': true,
  //   'items': [
  //     'A','B','C'
  //   ]
  // }

  // - UI Type: Instruction
  // Can be used to ask user to do something (other than text input)
  // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

  // var respDict = {
  //   'type': 'Interface',
  //   'interface': 'instruction',
  //   'title': 'Almost There',
  //   'detail': 'Please press the button on the bridge to finish the setup.',
  //   'heroImage': 'base64 image data',
  //   'showActivityIndicator': true,
  // 'showNextButton': true,
  // 'buttonText': 'Login in browser',
  // 'actionURL': 'https://google.com'
  // }

  // Plugin can set context to allow it track setup process
  context.ts = 'Hello';

  //invoke callback to update setup UI
  callback(respDict);
}

// Sample function to show how developer can add accessory dynamically from outside event
HomebridgeChromecast.prototype.addAccessory = function(chromecast) {
  this.log('Add Accessory');
  const platform = this,
        uuid = UUIDGen.generate(chromecast.txtRecord.id);

  var newAccessory = new Accessory(chromecast.name, uuid);
  newAccessory.on('identify', function(paired, callback) {
    platform.log(newAccessory.displayName, 'Identify!!!');
    callback();
  });
  // Plugin can save context on accessory
  // To help restore accessory in configureAccessory()
  // newAccessory.context.something = 'Something'

  Object.defineProperty(newAccessory, 'chromecast', {
    get: () => Promise.resolve(chromecast)
  });

  addCharacteristics(newAccessory);

  this.accessories.push(newAccessory);
  this.api.registerPlatformAccessories('homebridge-chromecast', 'HomebridgeChromecast', [newAccessory]);
  return newAccessory;
}

HomebridgeChromecast.prototype.updateAccessoriesReachability = function() {
  this.log('Update Reachability');
  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    const isReachable = !!discoveredChromecasts[accessory.displayName];
    accessory.updateReachability(isReachable);
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
HomebridgeChromecast.prototype.removeAccessory = function() {
  this.log('Remove Accessory');
  this.api.unregisterPlatformAccessories('homebridge-chromecast', 'HomebridgeChromecast', this.accessories);

  this.accessories = [];
}

function handleCallback(promise, callback){
  return promise.then(
    value => console.log('done..') || callback(null, value),
    err => console.log(err) || callback(err)
  );
}

function addCharacteristics(accessory){
  const switchService = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, accessory.chromecast ? accessory.chromecast.name : 'Chromecast');

  function wrapGetter(promisechain){
    return (cb) => promisechain().timeout(3000).then(data => cb(null, data), cb);
  }

  switchService.getCharacteristic(Characteristic.On)
    .on('get', wrapGetter(() => {
      if(!accessory.chromecast){
        return Promise.reject('Not availabe');
      }
      else if(accessory.chromecast.media && accessory.chromecast.media.status){
        return Promise.resolve(accessory.chromecast.isPlaying);
      }
      else {
        const playing = accessory.chromecast.chromecastConfig.txtRecord && accessory.chromecast.chromecastConfig.txtRecord.st === '1';
        return Promise.resolve(playing);
      }
    }))
    .on('set', (value, cb) => {
      ///TODO: PAUSE/STOP PÅ MULTICAST ISTÄLLET FÖR SIG SJÄLV!!!
      //Få till Chromecast-alarm på morgonen??
      if(!accessory.chromecast || !accessory.chromecast.media){
        return cb('not working');
      }
      //always control group
      const chromecast = /*accessory.chromecast.sessions && accessory.chromecast.sessions[0] && accessory.chromecast.sessions[0].appId === 'MultizoneFollower'
        ? _.find(discoveredChromecasts, c => {
          return (c.txtRecord.md === 'Google Cast Group' && c.sessions && c.sessions[0] && c.sessions[0].sessionId === accessory.chromecast.sessions[0].sessionId)
        }) || accessory.chromecast
        :*/ accessory.chromecast;

      if(value){
        handleCallback(chromecast.play(), cb);
      }
      else{
        handleCallback(chromecast.pause(), cb);
      }
    });

  const nowPlayingCharacteristic = switchService.getCharacteristic(NowPlaying) || switchService.addCharacteristic(NowPlaying);
  nowPlayingCharacteristic
    .on('get', wrapGetter(() => {
      const chromecast = accessory.chromecast;
      if(!chromecast){
        return cb('not working');
      }
      else if(chromecast.currentApplication){
        return Promise.resolve(chromecast.currentApplication.displayName);
      }
      else{
        return Promise.resolve('-');
      }
    }));

  const volumeCharacteristic = switchService.getCharacteristic(Characteristic.Brightness) || switchService.addCharacteristic(Characteristic.Brightness);
  volumeCharacteristic
    .on('get', wrapGetter(() => {
      if(!accessory.chromecast || !accessory.chromecast.volume){
        return cb('not working');
      }
      else{
        return Promise.resolve(parseInt(accessory.chromecast.volume.level * 100));
      }
    }))
    .on('set', (value, cb) => {
      if(!accessory.chromecast){
        return cb('Not available');
      }
      accessory.chromecast.setVolume(value).then(volume => cb(), cb);
    });

    const AudioFeedback = switchService.getCharacteristic(Characteristic.AudioFeedback) || switchService.addCharacteristic(Characteristic.AudioFeedback);
    AudioFeedback
      .on('get', wrapGetter(() => {
        if(!accessory.chromecast || !accessory.chromecast.volume){
          cb('not working');
        }
        else{
          return Promise.resolve(!accessory.chromecast.volume.isMuted);
        }
      }))
      .on('set', (value, cb) => {
        if(!accessory.chromecast){
          return cb('Not available');
        }
        accessory.chromecast.setMuted(!value).then(() => cb(), cb);
      });
}
