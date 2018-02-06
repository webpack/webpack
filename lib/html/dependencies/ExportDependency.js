const NullDependency = require("../dependencies/NullDependency");

class HTMLExportDependency extends NullDependency {
	constructor(exports) {
		super();

		this.exports = exports;
	}

	get type() {
		return 'html exports';
	}

	getExports() {
		return {
			exports: this.exports
		};
	}
}

module.exports = HTMLExportDependency;
