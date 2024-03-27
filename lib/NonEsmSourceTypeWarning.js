/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

class NonEsmSourceTypeWarning extends WebpackError {
	constructor(message) {
		super(message);

		this.name = "NonEsmSourceTypeWarning";
	}
}

makeSerializable(
	NonEsmSourceTypeWarning,
	"webpack/lib/NonEsmSourceTypeWarning"
);

module.exports = NonEsmSourceTypeWarning;
