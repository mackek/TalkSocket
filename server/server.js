var io = require('socket.io').listen(443);
var colors = require('colors');

io.set('log level', 2);

var mongo = require('mongodb').MongoClient,
    ObjectId = ObjectID = require('mongodb').ObjectID;

uuid = function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b};




var channels = {};
var users = {};
var cols = {};
var commands = {};

levels = {TRACE:"TRACE ".blue,DEBUG:"DEBUG ".green,INFO:"INFO  ".cyan,WARN:"WARN  ".yellow, ERROR:"ERROR ".red.bold};
logger = function(context, message) {
  var msg = [];
  if (context.level)   { msg.push(context.level); }
  if (context.channel) { msg.push("Channel: " + context.channel.name + "\t(" + context.channel.id + ")\n      "); }
  if (context.user)    { msg.push("User:    " + context.user.nickname + "\t\t(" + context.user.id +   ")\n      "); }
  if (context.action)  { msg.push("Action".bold + ":  " + context.action + "\n      "); }
  msg.push("Message".underline + ": " + message + "\n");
  console.log(msg.join(": "));
}

Channel = function(name, id) {
  this.name = name;
  this.id = id || "channel_" + uuid();
  this.password = false; 
}

Channel.prototype.public = function(include_users) {
  var chan = {name: this.name, id: this.id}
  if (include_users)
    chan.users = this.public_users();
  return chan;
}

Channel.prototype.public_users = function() {
  return io.of("/chat").clients(this.id).map(function(socket) {return socket.user.public();});
}

Channel.prototype.join = function(user, callback) {
  var _this = this;
  if (!io.sockets.manager.roomClients[user.socket.id][this.id]) {
    console.log("quicky");
    io.of("/chat").in(this.id).emit("join", {channel: this.public(), user: user.public()});
    cols.sessions.update({_id: user.binary_id()}, { $push: { channels: this.public() }}, function(err, result) {
      user.socket.join(_this.id);
      if (callback) { callback(undefined, true); }
    });
  } else {
    logger({user: user, channel: this, action: "join", level: levels.INFO}, "User already in channel. FAILED");
    if (callback) { callback("Already in room", false); }
  }
}
Channel.prototype.send = function(message, callback) {
  _this = this;
  cols.messages.insert({channel: this.name, sender: message.sender.public(), timestamp: message.timestamp, body: message.body}, function(err, result) {
    io.of('/chat').in(_this.id).emit("message",message.public());
    if (callback) { callback(null, true); } 
  });
}
Channel.prototype.leave = function(user, reason, callback) {
  user.socket.leave(this.id);
  io.of("/chat").in(this.id).emit("leave", {channel: this.public(), reason: reason, user: user.public()});
  if (callback) { callback(null, true); }
}
Channel.getByName = function(name, callback) {
  if (channels[name]) {
    logger({level: levels.TRACE, channel: channels[name]}, "Found channel " + name + " in memory");
    callback(channels[name]);
  } else {
    cols.channels.findOne({name: name},{name: true, id: true}, function(err, doc) {
      if (doc) {
        channels[name] = new Channel(doc.name, doc._id.toHexString());
        logger({level: levels.DEBUG, channel: channels[name]}, "Found " + name + " in MongoDB");
        callback(channels[name]);
      } else {
        logger({level: levels.DEBUG, channel: {name: name, id: "NIL"}}, "Didn't find " + name + " in database");
        cols.channels.insert({name: name}, function(err, result) {
          channels[name] = new Channel(name, result[0]._id.toHexString());
          logger({level:levels.INFO, channel: channels[name]}, "New channel created: " + name);
          callback(channels[name]);
        });
      }
    });
  }
}
Message = function(user, channel, body, timestamp) {
  this.sender = user;
  this.timestamp = timestamp || Date.now();
  this.body = body;
  this.channel = channel;
}
Message.prototype.public = function() {
  return { channel: {id: this.channel.id }, sender: this.sender.public(), body: this.body, timestamp: this.timestamp };
}

User = function(id, account, nickname, socket) {
  this.id = id;
  this.account = account;
  this.socket = socket;
  if (nickname)
    this.nickname = nickname;
  else
    this.nickname = account;
}
User.prototype.binary_id = function() {
  return new ObjectId.createFromHexString(this.id);
}
Channel.prototype.binary_id = function() {
  return new ObjectId.createFromHexString(this.id);
}
User.prototype.nick = function(nickname, client_callback) {
  _this = this;
  cols.sessions.update({_id: this.binary_id()}, { $push: { nicknames: {timestamp: Date.now(), nickname:  nickname}} }, function(err, result) {
    if (client_callback) { client_callback({nickname: nickname}); };
    _this.nickname = nickname;
    io.of("/chat").emit("nick", {user: _this.public()});
  });
}
User.prototype.public = function() {
  return {nickname: this.nickname, id: this.id}
}

// DATABASE FUNCTIONS
function checkCollections(db) {
  var checked = 0;
  function collectionChecked(err, c) {
    if (!err) {
      var key = c.collectionName;
      cols[key.substring(key.lastIndexOf(".")+1,key.length)] = c;
      if (++checked == 5)
        return true;
    }
  }
  db.collectionNames(function(err, collections) {
    if (!err) {
      var check = ["chat.accounts", "chat.channels", "chat.restrictions", "chat.sessions", "chat.messages"];
      for (var i = 0;i<check.length;i++)
      if (collections.indexOf(check[i]) == -1)
        db.createCollection(check[i], collectionChecked);
      else
        db.collection(check[i],collectionChecked);
    }
  });
}
function newSession(socket, account, nickname,  expires, channels, client_callback) {
  cols.sessions.insert({account: account, ip: socket.handshake.address.address, session: uuid(), expires: expires, connect_timestamp: Date.now(), nicknames: [{timestamp: Date.now(), nickname: nickname}]}, function(err,session_result) {
    socket.user = users[socket.id] = new User(session_result[0]._id.toHexString(), account, nickname, socket);
    var cb_data = socket.user.public();
    cb_data.session = session_result[0].session;
    cb_data.expires = session_result[0].expires;
    if (channels) { cb_data.channels = channels; }
    client_callback(cb_data);
  });
}
// EVENT HANDLERS
onAuth = function(socket, data, client_callback, success) {
  var session_duration = data.session_duration || 172800;
  var session_expires = Date.now() + session_duration * 1000;
  if (data.session) {
    cols.sessions.findOne({session: data.session}, function(err, session_result) {
      var nickname = session_result.nicknames[session_result.nicknames.length-1].nickname;
      var channels = session_result.channels;
      newSession(socket, session_result.account,nickname, session_expires, channels, client_callback);
      success();
    });
  } else {
    cols.accounts.findOne({account: data.account}, function(err, result) {
      if (result && (result.password == false || result.password == data.password)) {
        if (data.nickname && data.nickname != false) {
          nickname = data.nickname;
        } else {
          nickname = result.nickname;
        }
        newSession(socket, data.account, nickname, session_expires, null, client_callback);
        success();
      } else {
        client_callback({error:"User not authenticated"});
      }

    });
  };

};


onJoin = function(data, client_callback) {
  if (data.channel) {
    var sock = this;
    var query = {channel: data.channel};
    var limit = data.limit || 25;
    if (data.since) { messages.timestamp = {$gt: data.since} };

    Channel.getByName(data.channel, function(channel) {
      channel.join(sock.user, function(err, result) {
        if (!err) {
          cols.messages.find(query, {limit: limit}).toArray(function(err, result) {  
            logger({user: sock.user, channel: channel,level: levels.INFO}, "Joined");
            data = {channel: channel.public(true), user: sock.user.public()}
            data.channel.messages = result;
            client_callback( data );
          });
        } else 
          client_callback( {error: err} );
      });

    });
  } else {
    client_callback( {error: "No Channel specified"} );
  }
}




onMessage = function(data, client_callback) {
  var sock = this;
  channels[data.channel.name].send(new Message(sock.user, channels[data.channel.name], data.message), function() {
    logger({level: levels.INFO, user: sock.user, channel: channels[data.channel.name], action: "message"});                               
  });
};



onNick = function(data, client_callback) {
  if (data.nickname) {
    var taken = undefined;
    for (u in users) {
      if (users[u].nickname == data.nickname) {
        client_callback({error: "Nickname already in use."});
        taken = true;
        break;
      }
    }
    if (!taken) {
      var sock = this;
      cols.accounts.findOne({nickname: data.nickname}, function(err, result) { 
        if (result) { client_callback({error: "Nickname is reserved by a registered user"}); }
        else {
          sock.user.nick(data.nickname, client_callback);
        }
      });
    }
  } else {
    client_callback({error: "No nickname given"});
  }
};

onLeave = function(data, client_callback) { 
  var sock = this;
  Channel.getByName(data.channel, function(channel) {
    logger({user: sock.user, channel: channel, action: "leave", level: levels.info}, "");
    channel.leave(sock.user, data.reason, function() {
      client_callback({channel:channel.public()});
    });
  });
};

onDisconnect = function(data, client_callback) {
  if (this.user) {
    for (room in io.of("/chat").manager.roomClients[this.id]) {
      if (channels[room]) { channels[room].leave(this.user, "Client Disconnected"); }
    }
    delete(users[this.id]);
  }
}


commands["disconnect"] = onDisconnect;
commands["msg"] = onMessage;
commands["join"] = onJoin;
commands["nick"] = onNick;
commands["leave"] = onLeave;

//connect to the mongo database
mongo.connect("mongodb://localhost/chat", function(err, db) {
  if (err) {
    logger({level: levels.ERROR}, err);
  } else {
    // Setup MongoDB
    checkCollections(db);
    var chat = io.of('/chat');
    chat.on('connection', function (socket) {
      socket.on("auth", function(data, callback) {
        onAuth(socket, data, callback, function() {
          for (command in commands) {
            socket.on(command, commands[command]);
          }
          return true;
        });
      });

    });
  }
});
