goog.provide('talkSocket.Connector');
goog.provide('talkSocket.Connector.EventType');

goog.require('goog.events');
goog.require('goog.events.EventTarget');

goog.require('talkSocket.User');
goog.require('talkSocket.Message');
goog.require('talkSocket.Channel');

/**
 * Chat Connector.
 * Acts as the interface between socket.io and the chat client.
 *
 *
 *
 *
 *
 *
 *
 */

talkSocket.Connector = function(server_path) {
  goog.events.EventTarget.call(this);
  this.socket = io.connect(server_path, {"force new connection": true}).of('/chat');
  var _this = this;
  
  this.channels = {};
  this.users = {};
  this.self = {};
  this.parser = new talkSocket.Parser(this);
  this.connection_status = false;

  this.socket.on('join', function(data) {
    _this.getOrCreateUser(data.user).join( _this.getOrCreateChannel(data.channel)) 
  });
  this.socket.on('leave', function(data) {   
    _this.getOrCreateUser(data.user).leave(_this.getOrCreateChannel(data.channel)) 
  });
  this.socket.on('nick', function(data) {    
    _this.getOrCreateUser(data.user).nick(data.user.nickname) 
  });
  this.socket.on('message', function(data) { 
    _this.getOrCreateChannel(data.channel).message(new talkSocket.Message(data.channel, data.sender, data.body, data.timestamp)) 

  });
  this.socket.on('reconnect', function() {
    console.log("Reconnected!");
    _this.connection_status = true;
    _this.dispatchEvent({type:talkSocket.Connector.EventType.RECONNECT});
  });
  this.socket.on('reconnecting', function() {
    console.log("Reconnecting!");
    _this.dispatchEvent({type:talkSocket.Connector.EventType.RECONNECTING});
  });

  this.socket.on('reconnect_failed', function() {
    console.log("Reconnect failed!");
    _this.dispatchEvent({type:talkSocket.Connector.EventType.RECONNECT_FAILED});
  });
  this.socket.on('connect_failed', function() {
    _this.dispatchEvent({type:talkSocket.Connector.EventType.CONNECT_FAILED});
  });

  this.socket.on('disconnect', function() {
    console.log("Disconnected!");
    _this.connection_status = false;
    _this.dispatchEvent({type:talkSocket.Connector.EventType.DISCONNECT});
  });
  this.socket.on('connect', function() { 
    console.log("Connected!");
    _this.connection_status = true;
    _this.dispatchEvent({type:talkSocket.Connector.EventType.CONNECT}); 
  });
  return this;
}
goog.inherits(talkSocket.Connector, goog.events.EventTarget);

talkSocket.Connector.prototype.getChannel = function(channel_name) {
  for (var channel in this.channels) {
    if (this.channels[channel].name == channel_name) {
      return this.channels[channel];
    }
  }
}
talkSocket.Connector.prototype.getOrCreateChannel = function(channel) {
  if (this.channels[channel.id])
    return this.channels[channel.id];
  else
    return this.channels[channel.id] = new talkSocket.Channel(this, channel.id, channel.name);
}
talkSocket.Connector.prototype.getOrCreateUser = function(user) {
  if (this.users[user.id])
    return this.users[user.id];
  else 
    return this.users[user.id] = new talkSocket.User(this, user.id, user.username, user.nickname);
}

talkSocket.Connector.prototype.join = function(channel_name, callback) {
  var _this = this;
  this.socket.emit('join', {channel: channel_name}, function(data) {
    if (!data.error) {
      var channel = new talkSocket.Channel(_this, data.channel.id, data.channel.name);
      for (var i = data.channel.users.length-1; i >= 0; i--) {
        var user = _this.getOrCreateUser(data.channel.users[i]);
        user.join(channel);
      }
      if (data.channel.messages) {
        for (var i = 0; i < data.channel.messages.length; i++) {
          var message = data.channel.messages[i];
          channel.message(new talkSocket.Message(channel, message.sender, message.body, message.timestamp));
        }
      }
      _this.channels[channel.id] = channel;
      _this.dispatchEvent({type: talkSocket.Connector.EventType.JOIN, channel: channel});
      do_callback(callback, channel);
    } else 
      console.log(data.error);
  });
};

talkSocket.Connector.prototype.auth = function(credentials, nickname, callback) {
  var _this = this;
  credentials.nickname = nickname;
  this.socket.emit('auth', credentials, function(data) {
    _this.self = data;
    do_callback(callback, {session: data.session, expires: data.expires, channels: data.channels});
  });
};

talkSocket.Connector.prototype.nick = function(nickname, callback) {
  var _this = this;
  this.socket.emit('nick', {nickname: nickname}, function(data) {
    if (!data.error) {
      _this.self.nickname = data.nickname;
      console.log("Changed nickname to " + data.nickname);
      _this.dispatchEvent({type: talkSocket.Connector.EventType.NICK, nickname: data.nickname});
      do_callback(callback, data);
    } else 
      console.log(data.error);
  });
};
talkSocket.Connector.prototype.leave = function(channel, callback) {
  var _this = this;
  this.socket.emit('leave', {channel: channel.name}, function(data) {
    console.log("Leaving Channel " + channel.name);
    channel.dispatchEvent({type: talkSocket.Connector.EventType.LEAVE, channel: channel});
    do_callback(callback, {channel: channel});
    delete(_this.channels[channel.name]);
  });
};

talkSocket.Connector.prototype.quit = function(reason, callback) {
  this.socket.disconnect();
};

talkSocket.Connector.prototype.send = function(channel, message, callback) {
  var _this = this;
  this.socket.emit('msg', {channel: {name: channel.name, id: channel.id}, message: message});
};

talkSocket.Connector.EventType = {
  CONNECT: goog.events.getUniqueId('connect'),
  DISCONNECT: goog.events.getUniqueId('disconnect'),
  RECONNECT: goog.events.getUniqueId('reconnect'),
  RECONNECTING: goog.events.getUniqueId('reconnecting'),
  RECONNECT_FAILED: goog.events.getUniqueId('reconnect_failed'),
  CONNECT_FAILED: goog.events.getUniqueId('connect_failed'),
  JOIN: goog.events.getUniqueId('join'),
  LEAVE: goog.events.getUniqueId('leave'),
  NICK: goog.events.getUniqueId('nick')
}
