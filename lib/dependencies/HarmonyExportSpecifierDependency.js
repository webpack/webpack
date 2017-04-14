/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

class HarmonyExportSpecifierDependency extends NullDependency {
	constructor(originModule, id, name, position, immutable) {
		super();
		this.originModule = originModule;
		this.id = id;
		this.name = name;
		this.position = position;
		this.immutable = immutable;
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
	apply(dep, source) {
		const content = this.getPrefix(dep) + this.getContent(dep);
		source.insert(dep.position, content);
	}

	getPrefix(dep) {
		return dep.position > 0 ? "\n" : "";
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
		if(dep.immutable) {
			return `/* harmony export (immutable) */ ${exportsName}[${JSON.stringify(used)}] = ${dep.id};\n`;
		}

		return `/* harmony export (binding) */ __webpack_require__.d(${exportsName}, ${JSON.stringify(used)}, function() { return ${dep.id}; });\n`;
	}
};

module.exports = HarmonyExportSpecifierDependency;
