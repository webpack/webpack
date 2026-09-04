"use strict";

require("./log").push("ctor");

module.exports = function Ctor() {
	this.tag = "ctor";
};
