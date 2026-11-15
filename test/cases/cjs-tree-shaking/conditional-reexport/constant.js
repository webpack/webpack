"use strict";

if (true) {
	module.exports = require("./b?constant");
} else {
	module.exports = require("./a?constant");
}
