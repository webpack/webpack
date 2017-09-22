/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

class HarmonyExportSpecifierDependency extends NullDependency {
	constructor(originModule, id, name) {
		super();
		this.originModule = originModule;
		this.id = id;
		this.name = name;
	}

	get type() {
		return "harmony export specifier";
	}

	getExports() {
		return {
			exports: [this.name]
		};
	}

	describeHarmonyExport() {
		return {
			exportedName: this.name,
			precedence: 1
		};
	}
}

HarmonyExportSpecifierDependency.Template = class HarmonyExportSpecifierDependencyTemplate {
	apply(dep, source) {}

	getHarmonyInitOrder(dep) {
		return 0;
	}

	harmonyInit(dep, source, outputOptions, requestShortener) {
		const content = this.getContent(dep);
		source.insert(-1, content);
	}

	getContent(dep) {
		const used = dep.originModule.isUsed(dep.name);
		const active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
		if(!used) {
			return `/* unused harmony export ${(dep.name || "namespace")} */\n`;
		}

		if(!active) {
			return `/* inactive harmony export ${(dep.name || "namespace")} */\n`;
		}

		const exportsName = dep.originModule.exportsArgument || "exports";

		return `/* harmony export (binding) */ __webpack_require__.d(${exportsName}, ${JSON.stringify(used)}, function() { return ${dep.id}; });\n`;
	}
};

module.exports = HarmonyExportSpecifierDependency;
