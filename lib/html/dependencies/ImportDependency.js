const ModuleDependency = require('../dependencies/ModuleDependency')

class HTMLImportDependency extends ModuleDependency {
	constructor (request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return 'html import';
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

HTMLImportDependency.Template = class HTMLImportDependencyTemplate {
	apply(dependency, source, runtime) {
		console.log(dependency);
		console.log(source);
	}
}

module.exports = HTMLImportDependency;
