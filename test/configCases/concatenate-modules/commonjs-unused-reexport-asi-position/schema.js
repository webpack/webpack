"use strict";

require("./log").push("schema");

function Schema(types) {
	this.types = types;
}

module.exports = Schema;
