"use strict";

const supportsClassStaticBlock = require("../../../helpers/supportsClassStaticBlock");
const supportsLogicalAssignment = require("../../../helpers/supportsLogicalAssignment");

module.exports = () =>
	supportsClassStaticBlock() && supportsLogicalAssignment();
