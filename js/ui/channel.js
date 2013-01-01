talkSocket.ui.Controller = function(talk_socket, chatContainer, channelSelector) {
  channel_history = [];

  goog.events.listen(talk_socket, talkSocket.Connector.EventType.JOIN, function(data) {
    data.channel.ui = new talkSocket.ui.Channel(data.channel, chatContainer);
    data.channel.ui.buildDom();
    data.channel.ui.current();
    data.channel.ui.init();
    console.log("Joined channel " + data.channel.name);
  });
  goog.events.listen(talk_socket, talkSocket.Connector.EventType.LEAVE, function(data) {
    
    data.channel.ui.remove();
  });
  goog.events.listen(talk_socket, talkSocket.User.EventType.NICKNAME, function(data) {
    data.user.ui.updateUser();
  });

};


talkSocket.ui.User = function(user) {
  this.user = user;
  this.channel_refs = {};
};

goog.provide('talkSocket.ui.Channel');



talkSocket.ui.Channel = function(channel, channelContainer) {
  this.channel = channel;
  this.parent = channelContainer;
};

talkSocket.ui.Channel.prototype.buildDom = function() {

  var tmp = document.createElement("div");
  tmp.innerHTML = talkSocket.ui.templates.channel(this.channel);
  this.element = document.getElementById("chanel_" + this.channel.id) || this.parent.appendChild(tmp.children[0]);

  tmp.innerHTML = talkSocket.ui.templates.channelSelect(this.channel);
  this.selector = document.getElementById("channel_select_" + this.channel.id) || this.parent.getElementsByClassName("selectors")[0].appendChild(tmp.children[0]);
  this.userList = this.element.getElementsByClassName("users")[0];
  this.messageList = this.element.getElementsByClassName("messages")[0];
  this.messageBox = this.element.getElementsByClassName("msg-box")[0];
  this.addEventListners();
};
talkSocket.ui.Channel.prototype.init = function() {
  for(var i = this.channel.users.length-1;i>=0;i--){
    this.addUser(this.channel.users[i]);
  }
  for(var i = 0; i < this.channel.messages.length; i++) {
    this.addMessage(this.channel.messages[i]);
  }
};
talkSocket.ui.Channel.prototype.addUser = function(user) {
  var tmp = document.createElement("div");
  tmp.innerHTML = talkSocket.ui.templates.user({user:user, channel: this.channel});
  this.userList.appendChild(tmp.children[0]);
  var _this = this;
  goog.events.listen(user, talkSocket.User.EventType.NICKNAME, function(data) {
    _this.updateUser(user);
  });

};
talkSocket.ui.Channel.prototype.removeUser = function(user) {
  var elm = this.userList.children.namedItem("user_"+user.id);
  this.userList.removeChild(elm);
};
talkSocket.ui.Channel.prototype.updateUser = function(user) {
  var elm = this.userList.children.namedItem("user_"+user.id);
  var tmp = document.createElement("div");
  tmp.innerHTML = talkSocket.ui.templates.user({user:user, channel: this.channel});
  this.userList.replaceChild(tmp.children[0],elm);
};
talkSocket.ui.Channel.prototype.remove = function() {
  this.parent.removeChild(this.element);
  this.selector.parentElement.removeChild(this.selector);
};
talkSocket.ui.Channel.prototype.addEventListners = function() {
  var _this = this;
  this.selector.onclick = function() {
    _this.current();
  }
  goog.events.listen(this.channel, talkSocket.Channel.EventType.JOIN, function(data) {
    _this.addUser(data.user);
  })
  goog.events.listen(this.channel, talkSocket.Channel.EventType.LEAVE, function(data) {
    _this.removeUser(data.user);
  });
  goog.events.listen(this.channel, talkSocket.Channel.EventType.MESSAGE, function(data) {
    _this.addMessage(data.message);
  });
  this.messageBox.onkeypress = function(e) {
    if (e.keyCode == 13) {
      _this.channel.talk_socket.parser.parse(_this.channel, e.srcElement.value);
      e.srcElement.value = "";
    }
  };

};
talkSocket.ui.Channel.prototype.addMessage = function(message) {
  var tmp = document.createElement("div");
  tmp.innerHTML = talkSocket.ui.templates.message(message);
  this.messageList.appendChild(tmp.children[0]);
};
talkSocket.ui.Channel.prototype.current = function() {
  var current = this.parent.getElementsByClassName('current');
  for (i = current.length-1;i>=0;i--) {
    current[i].classList.remove('current')
  };
  this.selector.classList.add('current');
  this.element.classList.add('current');
};
