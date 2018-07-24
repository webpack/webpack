/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const InitFragment = require("../InitFragment");
const Template = require("../Template");
const ModuleDependency = require("./ModuleDependency");

class ProvidedDependency extends ModuleDependency {
	constructor(request, originModule, name, specifier, range, loc) {
		super(request);
		this.originModule = originModule;
		this.name = name;
		this.specifier = specifier;
		this.range = range;
		this.loc = loc;
	}

	get type() {
		return "provided";
	}
}

function getImportVarName(dep) {
	return `${Template.toIdentifier(dep.name)}__WEBPACK_PROVIDED_MODULE__`;
}

ProvidedDependency.Template = class ProvidedDependencyTemplate {
	apply(dep, source, runtime) {
		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			this.getContent(dep, runtime)
		);
	}

	getContent(dep, runtime) {
		return runtime.exportFromImport({
			module: dep.module,
			originModule: dep.originModule,
			request: dep.request,
			importVar: getImportVarName(dep),
			exportName: dep.specifier,
			asiSafe: true,
			isCall: false,
			callContext: null
		});
	}

	getInitFragments(dep, source, runtime) {
		return [
			new InitFragment(
				runtime.importStatement({
					update: false,
					module: dep.module,
					originModule: dep.originModule,
					request: dep.request,
					importVar: getImportVarName(dep)
				}),
				0,
				`provided ${dep.name}`
			)
		];
	}
};

module.exports = ProvidedDependency;
