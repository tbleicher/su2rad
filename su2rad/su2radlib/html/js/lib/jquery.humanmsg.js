/*
	HUMANIZED MESSAGES 1.0
	idea - http://www.humanized.com/weblog/2006/09/11/monolog_boxes_and_transparent_messages
	home - http://humanmsg.googlecode.com
*/

var humanMsg = {
	setup: function(appendTo, msgOpacity) {
		humanMsg.msgID = 'humanMsg';

		// appendTo is the element the msg is appended to
		if (appendTo == undefined)
			appendTo = 'body';

		// Opacity of the message
		humanMsg.msgOpacity = 0.9;

		if (msgOpacity != undefined) 
			humanMsg.msgOpacity = parseFloat(msgOpacity);

		// Inject the message structure
		jQuery(appendTo).append('<div id="'+humanMsg.msgID+'" class="humanMsg"><div class="round"></div><p></p><div class="round"></div></div>')
	},

	displayMsg: function(msg, msgclass) {
		if (msg == '')
			return;

                if (!msgclass)
                        msgclass = "notice";

		clearTimeout(humanMsg.t2);

		// Inject message
		// jQuery('#'+humanMsg.msgID+' p').html(msg + " msgclass='" + msgclass + "'")
		jQuery('#'+humanMsg.msgID+' p').html(msg)
		// TODO: set message class
		jQuery('#'+humanMsg.msgID).removeClass('notice')
		jQuery('#'+humanMsg.msgID).removeClass('warning')
		jQuery('#'+humanMsg.msgID).removeClass('error')
		jQuery('#'+humanMsg.msgID).addClass(msgclass)
	
		// Show message
		jQuery('#'+humanMsg.msgID+'').show().animate({ opacity: humanMsg.msgOpacity}, 200)

		// Watch for mouse & keyboard in .5s
		humanMsg.t1 = setTimeout("humanMsg.bindEvents()", 700)
		// Remove message after 5s
		humanMsg.t2 = setTimeout("humanMsg.removeMsg()", 2000)
	},

	bindEvents: function() {
	        // Remove message if mouse is moved or key is pressed
		jQuery(window)
			.mousemove(humanMsg.removeMsg)
			.click(humanMsg.removeMsg)
			.keypress(humanMsg.removeMsg)
	},

	removeMsg: function() {
		// Unbind mouse & keyboard
		jQuery(window)
			.unbind('mousemove', humanMsg.removeMsg)
			.unbind('click', humanMsg.removeMsg)
			.unbind('keypress', humanMsg.removeMsg)

		// If message is fully transparent, fade it out
		if (jQuery('#'+humanMsg.msgID).css('opacity') == humanMsg.msgOpacity)
			jQuery('#'+humanMsg.msgID).animate({ opacity: 0 }, 500, function() { jQuery(this).hide() })
	}
};

jQuery(document).ready(function(){
	humanMsg.setup();
})
