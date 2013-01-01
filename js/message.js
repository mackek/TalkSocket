goog.provide("talkSocket.Message");

talkSocket.Message = function(channel, sender, body, timestamp) {
  this.channel = channel;
  this.body = body;
  this.sender = sender;
  this.timestamp = timestamp;
  this.id = 42;
}


talkSocket.Message.prototype.short_time = function() {
  ts = new Date(this.timestamp);
  return pad(ts.getHours()) + ":" + pad(ts.getMinutes()) + ":" + pad(ts.getSeconds());
}

talkSocket.Message.prototype.long_time = function() {
  ts = new Date(this.timestamp);
  return ts.toLocaleString();
}
