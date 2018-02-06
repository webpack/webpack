const ModuleDependency = require('../dependencies/ModuleDependency')

class CSSURLDependency extends ModuleDependency {
	constructor(request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return 'css url';
	}

	getReference() {
		if (!this.module) {
			return null;
		}

		return {
			module: this.module,
			importedNames: [ this.name ]
		};
	}
}

module.exports = CSSURLDependency;
