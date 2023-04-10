// eslint-disable-next-line node/no-extraneous-require
const NodeEnvironment = require("jest-environment-node").TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
	constructor(config, context) {
		super(config, context);
	}

	// Workaround for `Symbol('JEST_STATE_SYMBOL')`
	async handleTestEvent(event, state) {
		if (!this.global["JEST_STATE_SYMBOL"]) {
			this.global["JEST_STATE_SYMBOL"] = state;
		}
	}
}

module.exports = CustomEnvironment;
