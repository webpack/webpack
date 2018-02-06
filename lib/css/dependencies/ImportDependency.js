const ModuleDependency = require('../dependencies/ModuleDependency');

class CSSImportDependency extends ModuleDependency {
	constructor(request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return 'css import';
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

CSSImportDependency.Template = class CSSImportDependencyTemplate {
	apply(dependency, source, runtime) {
		console.log(dependency)
		console.log(source)
	}
}

module.exports = CSSImportDependency;
