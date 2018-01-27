const merge = require("webpack-merge");

class PresetsApply {
	constructor() {
		this.presets = new Set();
	}
	process(options) {
		return merge({}, options, ...Array.from(this.presets));
	}
}

module.exports = PresetsApply;
