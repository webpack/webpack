"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		const used = dep.originModule.isUsed("default");
		let content;
		if(used) {
			content = `/* harmony default export */ exports[${JSON.stringify(used)}] = `;
		} else {
			content = "/* unused harmony default export */ var _unused_webpack_default_export = ";
		}
		if(dep.range) {
			source.replace(dep.rangeStatement[0], dep.range[0] - 1, content);
			source.replace(dep.range[1], dep.rangeStatement[1] - 1, ";");
		} else {
			source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
		}
	}
}
class HarmonyExportExpressionDependency extends NullDependency {
	constructor(originModule, range, rangeStatement) {
		super();
		this.originModule = originModule;
		this.range = range;
		this.rangeStatement = rangeStatement;
	}

	getExports() {
		return {
			exports: ["default"]
		};
	}

	describeHarmonyExport() {
		return {
			exportedName: "default",
			precedence: 1
		};
	}
}
HarmonyExportExpressionDependency.Template = Template;
HarmonyExportExpressionDependency.prototype.type = "harmony export expression";
module.exports = HarmonyExportExpressionDependency;

	getContent(used) {
		if(used) {
			return `/* harmony default export */ exports[${JSON.stringify(used)}] = `;
		}
		return "/* unused harmony default export */ var _unused_webpack_default_export = ";
	}
}

module.exports = HarmonyExportExpressionDependency;
