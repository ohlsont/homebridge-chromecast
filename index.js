/* @flow weak */
'use strict';

const http = require('http'),
      _ = require('lodash'),
      Chromecast = require('./chromecast.js'),
      homekitExtensions = require('./homekit-extensions.js'),
      Promise = require('bluebird');

let Accessory, Service, Characteristic, UUIDGen;

const NowPlaying = homekitExtensions.Characteristic.NowPlaying,
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
  homebridge.registerPlatform('homebridge-plugin-chromecast', 'HomebridgePluginChromecast', HomebridgeChromecast, true);
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

        Chromecast.scan(chromecast => {
          const chromecastConfig = chromecast.chromecastConfig;
          console.log('Added Chromecast "%s" at %s:%d', chromecastConfig.name, chromecastConfig.addresses[0], chromecastConfig.port);

          const uuid = UUIDGen.generate(chromecastConfig.txtRecord.id);

          discoveredChromecasts[uuid] = chromecast;

          if(!this.getAccessoryByID(uuid)){
            this.addAccessory(chromecastConfig);
          }

          chromecast.on('isPlaying', isPlaying => {
            console.log('isPlaying UPDATED: ' + isPlaying);
            const accessory = this.getAccessoryByID(uuid);
            accessory.getService(Service.Switch).getCharacteristic(Characteristic.On).setValue(isPlaying);
          });

          chromecast.on('isMuted', isMuted => {
            const accessory = this.getAccessoryByID(uuid);
            accessory.getService(Service.Switch)
              .getCharacteristic(Characteristic.AudioFeedback)
              .setValue(!isMuted);
          });

          chromecast.on('currentApplication', application => {
            const accessory = this.getAccessoryByID(uuid);
            accessory.getService(Service.Switch).getCharacteristic(NowPlaying).setValue(application
              ? application.displayName
              : '-');
          });

        });
      }.bind(this));
  }
}

HomebridgeChromecast.prototype.getAccessoryByID = function(UUID)
{
  console.log('finding ' + UUID)
  return _.find(this.accessories, { UUID });
}

// Function invoked when homebridge tries to restore cached accessory
// Developer can configure accessory at here (like setup event handler)
// Update current value
HomebridgeChromecast.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, 'Configure Accessory');
  var platform = this;

  Object.defineProperty(accessory, 'chromecast', {
    get: () => discoveredChromecasts[accessory.UUID]
  });


  // set the accessory to reachable if plugin can currently process the accessory
  // otherwise set to false and update the reachability later by invoking
  // accessory.updateReachability()
  accessory.reachable = !!accessory.chromecast;

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, 'Identify!!!');
    callback();
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
    callback(null, 'platform', true, {'platform':'HomebridgePluginChromecast', 'otherConfig':'SomeData'});
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
HomebridgeChromecast.prototype.addAccessory = function(chromecastConfig) {
  this.log('Add Accessory');
  const platform = this,
        uuid = UUIDGen.generate(chromecastConfig.txtRecord.id);

  var accessory = new Accessory(chromecastConfig.name, uuid);
  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, 'Identify!!!');
    callback();
  });
  // Plugin can save context on accessory
  // To help restore accessory in configureAccessory()
  // accessory.context.something = 'Something'

  Object.defineProperty(accessory, 'chromecast', {
    get: () => discoveredChromecasts[accessory.UUID]
  });

  addCharacteristics(accessory);

  this.accessories.push(accessory);
  this.api.registerPlatformAccessories('homebridge-plugin-chromecast', 'HomebridgePluginChromecast', [accessory]);

  return accessory;
}

HomebridgeChromecast.prototype.updateAccessoriesReachability = function() {
  this.log('Update Reachability');
  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    const isReachable = !!discoveredChromecasts[accessory.UUID];
    accessory.updateReachability(isReachable);
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
HomebridgeChromecast.prototype.removeAccessory = function() {
  this.log('Remove Accessory');
  this.api.unregisterPlatformAccessories('homebridge-plugin-chromecast', 'HomebridgePluginChromecast', this.accessories);

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
        return Promise.reject('Not available');
      }
      else{
        return Promise.resolve(accessory.chromecast.isPlaying);
      }
    }))
    .on('set', (value, cb) => {
      ///TODO: PAUSE/STOP PÅ MULTICAST ISTÄLLET FÖR SIG SJÄLV!!!
      //Få till Chromecast-alarm på morgonen??

      const chromecast = accessory.chromecast;

      if(!chromecast || !chromecast.media){
        return cb('not working');
      }

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
        return Promise.reject('not working');
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
      const chromecast = accessory.chromecast;
      if(!chromecast || !chromecast.volume){
        return Promise.reject('not working');
      }
      else{
        return Promise.resolve(parseInt(chromecast.volume.level * 100));
      }
    }))
    .on('set', (value, cb) => {
      const chromecast = accessory.chromecast;
      if(!chromecast){
        return cb('Not available');
      }
      chromecast.setVolume(value).then(volume => cb(), cb);
    });

    const AudioFeedback = switchService.getCharacteristic(Characteristic.AudioFeedback) || switchService.addCharacteristic(Characteristic.AudioFeedback);
    AudioFeedback
      .on('get', wrapGetter(() => {
        const chromecast = accessory.chromecast;

        if(!chromecast || !chromecast.volume){
          return Promise.reject('not working');
        }
        else{
          return Promise.resolve(!chromecast.volume.isMuted);
        }
      }))
      .on('set', (value, cb) => {
        const chromecast = accessory.chromecast;

        if(!chromecast){
          return cb('Not available');
        }

        chromecast.setMuted(!value)
          .then(() => cb(), cb);
      });
}
