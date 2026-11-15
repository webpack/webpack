"use strict";

if (process.env.NODE_ENV === "production") {
	module.exports = require("./target");
} else {
	module.exports = require("./other");
}
