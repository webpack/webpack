"use strict";

const NodeEnvironment =
	// For jest@29
	require("jest-environment-node").TestEnvironment ||
	// For jest@27
	require("jest-environment-node");

class CustomEnvironment extends NodeEnvironment {
	constructor(config, context) {
		// Deno holds `localStorage` in a SQLite file behind an accessor whose setter opens
		// it — every worker on one path, which answers `database is locked`. Taken off the
		// global first, so the assignment below is the plain property it is on Node.
		delete global.localStorage;
		delete global.sessionStorage;
		// TODO - regression in jest/Node@25.2.0, temporary fix
		global.localStorage = undefined;
		super(config, context);
	}

	// Workaround for `Symbol('JEST_STATE_SYMBOL')`
	async handleTestEvent(event, state) {
		if (!this.global.JEST_STATE_SYMBOL) {
			this.global.JEST_STATE_SYMBOL = state;
		}
	}
}

module.exports = CustomEnvironment;
