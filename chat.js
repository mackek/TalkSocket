window.onload = (function() {
  var channels = [];
  var session = getCookie("chat-session");
  chat = new talkSocket.Connector("http://rpitv.org:443");
  
  ui_controller = new talkSocket.ui.Controller(chat, document.getElementById('channels'), document.getElementById('channel-list'));
  
  goog.events.listen(chat, talkSocket.Connector.EventType.CONNECT, function() {
    var credentials = {};
    if (session) {
      credentials.session = session;
    } else {
      credentials.account = "guest";
    }
    chat.auth(credentials, undefined, function(session_data) {
      setCookie( "chat-session" , session_data.session, session_data.expires );
      if (!session_data.channels) {
        chat.join("#default");
      } else {
        for (var i = 0; i < session_data.channels.length; i++) {
          if (!channels[session_data.channels[i]]) {
            chat.join(session_data.channels[i].name);
          }
        }
      }
    });

  });
   
  goog.events.listen(chat, talkSocket.Connector.EventType.RECONNECTING, function() { 
    reconnecting = true;
  });
  
})
