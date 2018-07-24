/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const InitFragment = require("../InitFragment");
const Template = require("../Template");
const ModuleDependency = require("./ModuleDependency");

/**
 * @param {ProvidedDependency} dependency [TODO]
 * @returns {string} [TODO]
 */
const getImportVarName = dependency => {
	return `${Template.toIdentifier(dependency.name)}__WEBPACK_PROVIDED_MODULE__`;
};

class ProvidedDependency extends ModuleDependency {
	constructor(request, originModule, name, specifier, range) {
		super(request);
		this.originModule = originModule;
		this.name = name;
		this.specifier = specifier;
		this.range = range;
	}

	get type() {
		return "provided";
	}
}

ProvidedDependency.Template = class ProvidedDependencyTemplate extends ModuleDependency.Template {
	apply(dependency, source, runtimeTemplate, dependencyTemplates) {
		source.replace(
			dependency.range[0],
			dependency.range[1] - 1,
			this.getContent(dependency, runtimeTemplate)
		);
	}

	getContent(dependency, runtimeTemplate) {
		return runtimeTemplate.exportFromImport({
			module: dependency.module,
			originModule: dependency.originModule,
			request: dependency.request,
			importVar: getImportVarName(dependency),
			exportName: dependency.specifier,
			asiSafe: true,
			isCall: false,
			callContext: null
		});
	}

	getInitFragments(dependency, source, runtimeTemplate, dependencyTemplates) {
		return [
			new InitFragment(
				runtimeTemplate.importStatement({
					update: false,
					module: dependency.module,
					originModule: dependency.originModule,
					request: dependency.request,
					importVar: getImportVarName(dependency)
				}),
				0,
				`provided ${dependency.name}`
			)
		];
	}
};

module.exports = ProvidedDependency;
