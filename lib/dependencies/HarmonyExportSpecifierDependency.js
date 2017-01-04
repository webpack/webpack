"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");
class Template {
	apply(dep, source) {
		const used = dep.originModule.isUsed(dep.name);
		const active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
		let content;
		if(!used) {
			content = `/* unused harmony export ${dep.name || "namespace"} */\n`;
		} else if(!active) {
			content = `/* inactive harmony export ${dep.name || "namespace"} */\n`;
		} else if(dep.immutable) {
			content = `/* harmony export (immutable) */ exports[${JSON.stringify(used)}] = ${dep.id};\n`;
		} else {
			content = `/* harmony export (binding) */ __webpack_require__.d(exports, ${JSON.stringify(used)}, function() { return ${dep.id}; });\n`;
		}
		if(dep.position > 0) {
			content = `\n${content}`;
		}
		source.insert(dep.position, content);
	}
}
class HarmonyExportSpecifierDependency extends NullDependency {
	constructor(originModule, id, name, position, immutable) {
		super();
		this.originModule = originModule;
		this.id = id;
		this.name = name;
		this.position = position;
		this.immutable = immutable;
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
HarmonyExportSpecifierDependency.Template = Template;
HarmonyExportSpecifierDependency.prototype.type = "harmony export specifier";
module.exports = HarmonyExportSpecifierDependency;
