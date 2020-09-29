
const express = require('express');
const endUser_App = express();
const support_App = express();
const http = require('http');

// Create server to listen for end-user requests and support personnel requests
let endUser_Server = http.createServer(endUser_App);
let support_Server = http.createServer(support_App);

const endUser_Io = require('socket.io')(endUser_Server);
const support_Io = require('socket.io')(support_Server);

const endUser_Port = process.env.PORT || 3000;
const support_Port = 3001;

// Set both apps/servers to use content from public dir of this server
endUser_App.use(express.static(__dirname + '/public'));
support_App.use(express.static(__dirname + '/public'));

// Set io clients initial connections to their appropriate functions
endUser_Io.on('connection', onEndUser_Connection);
support_Io.on('connection', onSupportUser_Connection);

// Start server that handles end user requests
endUser_Server.listen(endUser_Port, function() {
    console.log('Listening on port ' + endUser_Port);
});

// Start server that handles support users requests
support_Server.listen(support_Port, function() {
    console.log('Client View Server listening on port ' + support_Port);
});


// Keep of track end-user and support users uuids, socket ids, and relations to one another
let endUsers = {};
let supportUsers = {};

// Standard events that are passed directly between sockets
let socketEvents = ['mouseMovement', 'domUpdate', 'leftClick', 'supportConnected', 'clientCookies', 'time', 'clickRec', 'canvasData'];

// Socket events that are only sent to support user
let supportUser_socketEvents = ['mouseMovement', 'domUpdate', 'leftClick', 'supportConnected', 'resize', 'clientCookies', 'time', 'clickRec', 'canvasData'];

function onEndUser_Connection(socket) {

  let handshakeData = socket.request;
  let endUser_Id = handshakeData._query['clientId'];
  let endUser_DocumentUrl = decodeURIComponent(handshakeData._query['documentUrl']);
  let endUser_windowWidth = handshakeData._query['clientWidth'];
  let endUser_redirect = handshakeData._query['redirectClientView'];

  if (Object.keys(endUsers).indexOf(endUser_Id) == -1) {
    console.log('adding client ' + endUser_Id);
    endUsers[endUser_Id] = {'connectionStartTime': Date.now(), 'endUser_SocketId':socket.id, 
      'supportUser_SocketId': '', 'supportUser_Id': '', 'endUser_DocumentUrl':endUser_DocumentUrl, 
      'windowWidth': endUser_windowWidth};
  } else if (endUser_redirect) {
    // The client id already exists, page has been redirected from their end
    console.log('redirecting support user to new page for client ' + endUser_Id + ' to ' + endUser_DocumentUrl);

    // Close this support user and end user socket id, they will be restablished on new connection
    if (endUsers[endUser_Id]['supportUser_SocketId'] != null && endUsers[endUser_Id]['supportUser_SocketId'] != '') {
      // disconnectQuiet
      // support_Io.to(endUsers[endUser_Id]['supportUser_SocketId']).emit('disconnectQuiet', {'socketId':endUsers[endUser_Id]['supportUser_SocketId']});
      delete support_Io.sockets.connected[endUsers[endUser_Id]['supportUser_SocketId']];
    }
    if (endUsers[endUser_Id]['endUser_SocketId'] != null && endUsers[endUser_Id]['endUser_SocketId'] != '') {
      // endUser_Io.to(endUsers[endUser_Id]['endUser_SocketId']).emit('disconnectQuiet', {'socketId':endUsers[endUser_Id]['endUser_SocketId']});
      delete endUser_Io.sockets.connected[endUsers[endUser_Id]['endUser_SocketId']];
    }

    // Set up redirected client to use the new socket id and redirect url
    endUsers[endUser_Id]['endUser_SocketId'] = socket.id;
    endUsers[endUser_Id]['endUser_DocumentUrl'] = endUser_DocumentUrl;
    endUsers[endUser_Id]['windowWidth'] = endUser_windowWidth;
  }

  // Standard events that are transferred directly between sockets
  for (let socketEvent in supportUser_socketEvents) {
    socket.on(supportUser_socketEvents[socketEvent], (data) => {
      for (var endUser_Id in endUsers) {
        let foundSupportUser_SocketId = endUsers[endUser_Id]['supportUser_SocketId'];
        let foundEndUser_SocketId = endUsers[endUser_Id]['endUser_SocketId'];
        if (foundEndUser_SocketId == socket.id && foundSupportUser_SocketId != '' && foundSupportUser_SocketId != null) {
          support_Io.to(foundSupportUser_SocketId).emit(supportUser_socketEvents[socketEvent], data);
          break;
        }
      }
    });
  }

  // Testing
  /* socket.on('documentUrl', (data) => {
    for (var endUser_Id in endUsers) {
      let foundSupportUser_SocketId = endUsers[endUser_Id]['supportUser_SocketId'];
      let foundEndUser_SocketId = endUsers[endUser_Id]['endUser_SocketId'];
      if (foundEndUser_SocketId == socket.id && foundSupportUser_SocketId != '' && foundSupportUser_SocketId != null) {
        support_Io.to(foundSupportUser_SocketId).emit('documentUrl', data);
        break;
      }
    }
  }); */

  // delete reference to client
  socket.on('disconnectClient', (data) => {
    let disconnectEndUser_Id = data['clientId'];
    for (var endUser_Id in endUsers) {
      let foundSupportUser_SocketId = endUsers[endUser_Id]['supportUser_SocketId'];
      if (endUser_Id == disconnectEndUser_Id && foundSupportUser_SocketId != '' && foundSupportUser_SocketId != null) {
        support_Io.to(foundSupportUser_SocketId).emit('disconnect');
        break;
      }
    }
    delete endUsers[disconnectEndUser_Id];
  });
}

function onSupportUser_Connection(socket) {
  let handshakeData = socket.request;
  let supportUser_Id = handshakeData._query['supportUser_Id'];
  let passedEndUser_Id = handshakeData._query['endUserId'];
  let reconnectSupport = handshakeData._query['reconnect'];

  if (Object.keys(supportUsers).indexOf(supportUser_Id) == -1) {
    supportUsers[supportUser_Id] = {'connectionStartTime': Date.now(), 
      'supportUser_SocketId':socket.id, 'endUser_SocketId':''};
  }

  // Make sure client connnection still exists
  if (Object.keys(endUsers)[passedEndUser_Id] != 'undefined') {

    // Make sure that selected support user uuid is not empty or null
    if (supportUser_Id != '' && supportUser_Id != null) {

      // Make sure client is not already being helped by another support person
      if (endUsers[passedEndUser_Id]['supportUser_SocketId'] == '') {
        endUsers[passedEndUser_Id]['supportUser_SocketId'] = socket.id;
        endUsers[passedEndUser_Id]['supportUser_Id'] = supportUser_Id;
      } else if (reconnectSupport == true || reconnectSupport == "true") {
        endUsers[passedEndUser_Id]['supportUser_SocketId'] = socket.id;
        endUsers[passedEndUser_Id]['supportUser_Id'] = supportUser_Id;
      }
    }
  }

  // Standard events that are transferred directly between sockets
  for (let socketEvent in socketEvents) {
    socket.on(socketEvents[socketEvent], (data) => {
      for (var endUser_Id in endUsers) {
        let foundSupportUser_SocketId = endUsers[endUser_Id]['supportUser_SocketId'];
        let foundEndUser_SocketId = endUsers[endUser_Id]['endUser_SocketId'];
        if (foundSupportUser_SocketId == socket.id && foundEndUser_SocketId != '' && foundEndUser_SocketId != null) {
          endUser_Io.to(foundEndUser_SocketId).emit(socketEvents[socketEvent], data);
          break;
        }
      }
    });
  }

  // delete reference to support user
  socket.on('disconnectSupport', (data) => {
    console.log('support user canceled the connection');
    let disconnectSupportUser_Id = data['supportUser_Id'];
    //delete endUsers[disconnectEndUser_Id];
    console.log(disconnectSupportUser_Id);
    for (var endUser_Id in endUsers) {
      let foundSupportUser_SocketId = endUsers[endUser_Id]['supportUser_SocketId'];
      let foundEndUser_SocketId = endUsers[endUser_Id]['endUser_SocketId'];
      if (foundSupportUser_SocketId == socket.id && foundEndUser_SocketId != '' && foundEndUser_SocketId != null) {
        endUser_Io.to(foundEndUser_SocketId).emit('disconnect', data);
        console.log('found the end user and removing them');
        delete endUsers[endUser_Id];
        break;
      }
    }
  });
}

endUser_App.get('/activeEndUsers', (req, res) => {
  res.send(JSON.stringify(endUsers));
});

/* endUser_App.get('/toggleView', function(req, res) {
  let selectedEndUser = req.query.endUser_Id;
  let selectedSupportUser = req.query.supportUser_Id;
  console.log('Toggle View');
  console.log(selectedEndUser);
  console.log(selectedSupportUser);

  // Make sure client connnection still exists
  if (Object.keys(endUsers)[selectedEndUser] != 'undefined') {

    // Make sure client is not already being helped by another support person
    if (typeof(endUsers[selectedEndUser]['supportUser_SocketId']) != 'undefined' && endUsers[selectedEndUser]['supportUser_SocketId'] != '') {

      // Make sure that selected support user uuid is not empty or null
      if (selectedSupportUser != '' && selectedSupportUser != null && supportUsers[selectedSupportUser] != 'undefined') {

        let foundSupportUser_SocketId = supportUsers[selectedSupportUser]['supportUser_SocketId'];

        if (foundSupportUser_SocketId != null && foundSupportUser_SocketId != '') {

          endUsers[selectedEndUser]['supportUser_SocketId'] = foundSupportUser_SocketId;
        }
      }
    }
  }

  res.send('switched to other active session');
}); */

