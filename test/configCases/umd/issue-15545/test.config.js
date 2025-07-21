"use strict";

const CONTEXT = {};

module.exports = {
	nonEsmThis() {
		return CONTEXT;
	},
	findBundle() {
		return ["./runtime.js", "./main.js"];
	}
};
