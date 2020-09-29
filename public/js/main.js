'use strict';

$(document).ready(function() {

  // When a support user reaches the page, assign them a unique id
  var supportUserId = uniqueId();
  console.log(supportUserId);

  // Handler for clicking on the support button links
  $('#supportRequests').on('click', 'button.clientIdConn', function() {

    // Check if another support user is helping, dont allow overtaking their session
    if (!$(this).hasClass("supportInProgressOtherUser")) {

      // Remove active view status from other connections
      $('.clientIdConn').each(function() {
        $(this).removeClass('activeView');
      });

      console.log('clicked on the client id p tag');
      // Grab their connection id and the site they are on
      var selectedClientId = $(this).attr('id');
      var clientWebSite = $(this).data('endUser_DocumentUrl');

      // Toggle support views if this one is already active
      var reconnect = ($(this).hasClass("supportInProgress")) ? '&reconnect=true' : '';

      // Set the url parameters for the support user id and the client id to view
      var argSelector = (clientWebSite.indexOf('?') == -1) ? "?" : "&";
      $('#endUserView').attr('src', clientWebSite + argSelector + 'supportUser_Id=' 
        + supportUserId + '&endUser_Id=' + selectedClientId + reconnect);
      console.log(clientWebSite);

      // Indicate the user is being helped AND this sesssion is active in the view
      $(this).addClass('supportInProgress');
      $(this).addClass('activeView');
    }
    else {
      alert('Another support user is already helping this person');
    }
  });

  // Query for new support requests every second
  setInterval(function() {
    // Find open support requests
    $.getJSON('activeEndUsers', function(resp) {
      // Iterate over the open requests
      for (var clientId in resp) {
        // Find out if the user is already being helped and the site they are visiting
        var supportUserHelping = resp[clientId]['supportUser_SocketId'];
        var endUser_DocumentUrl = resp[clientId]['endUser_DocumentUrl'];
        var otherEndUserHelpingId = resp[clientId]['supportUser_Id'];
        var otherEndUserHelping = false;

        if (otherEndUserHelpingId != "" && otherEndUserHelpingId != supportUserId) {
          otherEndUserHelping = true;
        }

        // If an element does not exist with this client id, add it to dom
        if ($('#'+clientId).length == 0) {
          // Add a class if the user is already being helped
          var supportInProgressClass = (supportUserHelping == "") ? "" : " supportInProgress";
          var otherSupportInProgressClass = (otherEndUserHelping) ? " supportInProgressOtherUser" : "";
          $('#supportRequests').append('<button class="clientIdConn' + supportInProgressClass + otherSupportInProgressClass + '" id="'
            +clientId+'" title="' + endUser_DocumentUrl +  '">'+endUser_DocumentUrl+'</button>');

          $('#'+clientId).data('endUser_DocumentUrl', endUser_DocumentUrl);
          $('#'+clientId).data('supportUserId', otherEndUserHelpingId);
        } else {
          // If the session already exists and is not being helped remove their active session status
	  if (supportUserHelping == "") {
            $('#'+clientId).removeClass('supportInProgress');
          } else {
            // Set the support button link to indicate that the user is being helped
            $('#'+clientId).addClass('supportInProgress');

	    // If the end user has a new document url, update it here
            if ($('#'+clientId).data('endUser_DocumentUrl') != endUser_DocumentUrl) {
              $('#'+clientId).data('endUser_DocumentUrl', endUser_DocumentUrl);
              $('#'+clientId).prop('title', endUser_DocumentUrl);
              $('#'+clientId).html(endUser_DocumentUrl);
              $('#'+clientId).click();
            }

            $('#'+clientId).data('endUser_DocumentUrl', endUser_DocumentUrl);
          }

          // Mark this button to indicate whether another support user is helping
          if (!otherEndUserHelping) {
            $('#'+clientId).removeClass('supportInProgressOtherUser');
          } else {
            $('#'+clientId).addClass('supportInProgressOtherUser');
            $('#'+clientId).data('supportUserId', otherEndUserHelpingId);
          }
        }
      }

      // Iterate over the active session links and if their connection has been closed, remove the link
      $('.clientIdConn').each(function() {
        var openConnectionClientId = $(this).attr('id');
        if (typeof(resp[openConnectionClientId]) == 'undefined') {
          $(this).remove();
        }
      });

    });
  }, 500);

  // Generate a semi-random support id for users viewing this page
  function uniqueId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  };

});
