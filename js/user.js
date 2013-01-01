goog.provide('talkSocket.User');
goog.provide('talkSocket.User.EventType');

goog.require('goog.events');
goog.require('goog.events.EventTarget');

talkSocket.User = function(ts, id, username, nickname) {
  this.id = id;
  this.ts = ts;
  this.username = username;
  this.nickname = nickname;
  this.channels = [];
};
goog.inherits(talkSocket.User, goog.events.EventTarget);

talkSocket.User.prototype.nick = function(nickname) {
  if (!goog.isNull(nickname))
    this.nickname = nickname;
  else
    return this.nickname;
  this.dispatchEvent({type:talkSocket.User.EventType.NICKNAME, user: this})
};

talkSocket.User.prototype.join = function(channel) {
  if (channel.join(this)) 
    this.channels.push(channel);
  this.dispatchEvent({type:talkSocket.User.EventType.JOIN, user: this})
};

talkSocket.User.prototype.leave = function(channel, reason) {
  channel.leave(this, reason);
  this.channels.splice(this.channels.indexOf(channel), 1);
  this.dispatchEvent({type:talkSocket.User.EventType.LEAVE, user: this});
};

talkSocket.User.prototype.quit = function() {
  for (var i = this.channels.length - 1; i>=0;i--) {
    this.leave(this.channels[i], "Client Quit");
  }
};

talkSocket.User.prototype.status = function(status) {

};

talkSocket.User.getUserById = function(id) {
  return talkSocket.User._Users[id];
};

talkSocket.User.EventType = {
  JOIN: goog.events.getUniqueId('join'),
  LEAVE: goog.events.getUniqueId('leave'),
  NICKNAME: goog.events.getUniqueId('nickname'),
  QUIT: goog.events.getUniqueId('quit')
};
