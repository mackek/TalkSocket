goog.provide("talkSocket.Parser");



talkSocket.Parser = function(ts) {
  this.talk_socket = ts;
}

// join #CHANNEL password
talkSocket.Parser.prototype.parse = function(channel, text) {
  if (text[0] == "/") {
    args = text.split(" ");
    switch(args[0]) {
      case "/join": 
        this.talk_socket.join(args[1]);
        break;
      case "/nick":
        this.talk_socket.nick(args[1]);
        break;
      case "/leave":
        this.talk_socket.leave(args[1] ? this.talk_socket.getChannel(args[1]) : channel);
        break;
    };
  } else {
    this.talk_socket.send(channel, text, null);
  }

}
