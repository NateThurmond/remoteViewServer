'use strict';

$(document).ready(function() {

var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
     return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};

(function() {

  var supportUser_Id = getUrlParameter('supportUser_Id');
  console.log(supportUser_Id);

  var socket = io('http://localhost:3001', {query: 'supportUser_Id=' + supportUser_Id});
  var docBody = $('body');
  docBody.append('<img id="remoteViewCursor" src="/cursor.png"/>');

  var current = {};

  docBody.on('mousedown', onMouseDown, false);
  docBody.on('mouseup', onMouseUp, false);
  docBody.on('mouseout', onMouseUp, false);
  docBody.on('mousemove', throttle(onMouseMove, 10), false);

  socket.on('mouseMovement', onMouseMovementEvent);

  socket.on('documentUrl', function(data) {
    console.log(data);
  });

  window.addEventListener('resize', onResize, false);
  onResize();


  function mouseMovement(x0, y0, x1, y1, emit){

    if (!emit) { return; }
    var w = docBody.width();
    var h = docBody.height();

    socket.compress(true).emit('mouseMovement', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h
    });
  }

  function onMouseDown(e){
    //current.x = e.clientX;
    //current.y = e.clientY;
  }

  function onMouseUp(e){
    //drawing = false;
    //mouseMovement(current.x, current.y, e.clientX, e.clientY, true);
  }

  function onMouseMove(e){
    mouseMovement(current.x, current.y, e.clientX, e.clientY, true);
    current.x = e.clientX;
    current.y = e.clientY;
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onMouseMovementEvent(data){

    var w = docBody.width();
    var h = docBody.height();
    //console.log(data.x0 * w);
    //console.log(data.x1 * w);

    $('#remoteViewCursor').css({'display':'block','left':(data.x1 * w)+'px','top':(data.y1 * h)+'px'});
    //$('#remoteViewCursor').css({'display':'block','left':'100px','top':'100px'});

    mouseMovement(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h);
  }

  // make the canvas fill its parent
  function onResize() {
    docBody.width(window.innerWidth);
    docBody.height(window.innerHeight);
  }

})();

});
