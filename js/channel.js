goog.provide("talkSocket.Channel");
goog.provide("talkSocket.Channel.EventType");

goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require("talkSocket.User");
goog.require("talkSocket.Message");

talkSocket.Channel = function(ts, id, name) {
  goog.events.EventTarget.call(this);
  this.setParentEventTarget(ts);
  
  this.talk_socket = ts;
  this.id = id;
  this.name = name;
  this.users = [];
  this.messages = [];
}

goog.inherits(talkSocket.Channel, goog.events.EventTarget);

talkSocket.Channel.prototype.join = function(user) {
  this.users.push(user);
  this.dispatchEvent({type:talkSocket.Channel.EventType.JOIN, user: user});
  return true;
}

talkSocket.Channel.prototype.leave = function(user) {
  this.users = this.users.splice(this.users.indexOf(user),1);
  this.dispatchEvent({type:talkSocket.Channel.EventType.LEAVE, user: user})
  return true;
}

talkSocket.Channel.prototype.send = function(message) {
  this.talk_socket.send(this, message);
}
talkSocket.Channel.prototype.message = function(message) {
  this.dispatchEvent({type: talkSocket.Channel.EventType.MESSAGE, message:message});
  this.messages.push(message);
}
talkSocket.Channel.EventType = {
  MESSAGE: goog.events.getUniqueId('message'),
  JOIN: goog.events.getUniqueId('join'),
  LEAVE: goog.events.getUniqueId('leave')
}
