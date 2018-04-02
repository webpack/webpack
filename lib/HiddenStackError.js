/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/
"use strict";

module.exports = class HiddenStackError extends Error {
	constructor(...args) {
		super(...args);
		this.hideStack = true;
	}
};
