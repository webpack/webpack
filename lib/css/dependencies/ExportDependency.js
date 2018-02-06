const NullDependency = require("../dependencies/NullDependency")

class CSSExportDependency extends NullDependency {
	constructor(exports) {
		super();

		this.exports = exports;
	}

	get type() {
		return 'css exports'
	}

	getExports() {
		return {
			exports: this.exports;
		};
	}
}

module.exports = CSSExportDependency;
