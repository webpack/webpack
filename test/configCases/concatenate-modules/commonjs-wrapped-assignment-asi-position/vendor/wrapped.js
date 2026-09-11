"use strict";

var container = {
	outputs: {
		formats: {
			text: {
				wrap: function (state, entry) {
					return entry;
				}
			},
			html: {
				wrap: function (state, entry) {
					return entry;
				}
			}
		}
	}
};

module.exports = container;
