"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source) {
		const localModuleVar = dep.localModule && dep.localModule.used && dep.localModule.variableName();

		function replace(def, text) {
			if(localModuleVar) {
				text = text.replace(/XXX/g, localModuleVar.replace(/\$/g, "$$$$"));
			}
			if(localModuleVar) {
				def = def.replace(/XXX/g, localModuleVar.replace(/\$/g, "$$$$"));
			}
			const texts = text.split("#");
			if(def) {
				source.insert(0, def);
			}
			let current = dep.range[0];
			if(dep.arrayRange) {
				source.replace(current, dep.arrayRange[0] - 1, texts.shift());
				current = dep.arrayRange[1];
			}
			if(dep.objectRange) {
				source.replace(current, dep.objectRange[0] - 1, texts.shift());
				current = dep.objectRange[1];
			} else if(dep.functionRange) {
				source.replace(current, dep.functionRange[0] - 1, texts.shift());
				current = dep.functionRange[1];
			}
			source.replace(current, dep.range[1] - 1, texts.shift());
			if(texts.length > 0) {
				throw new Error("Implementation error");
			}
		}

		const branch = (localModuleVar ? "l" : "")
			+ (dep.arrayRange ? "a" : "")
			+ (dep.objectRange ? "o" : "")
			+ (dep.functionRange ? "f" : "");
		const defs = {
			f: [
				"var __WEBPACK_AMD_DEFINE_RESULT__;",
				"!(__WEBPACK_AMD_DEFINE_RESULT__ = #.call(exports, __webpack_require__, exports, module), " +
				"__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))"
			],
			o: ["", "!(module.exports = #)"],
			of: [
				"var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;",
				"!(__WEBPACK_AMD_DEFINE_FACTORY__ = (#), " +
				"__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? " +
				"(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : " +
				"__WEBPACK_AMD_DEFINE_FACTORY__), " + "__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))"
			],
			af: [
				"var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;",
				"!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_RESULT__ = #.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), " +
				"__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))"
			],
			ao: ["", "!(#, module.exports = #)"],
			aof: [
				"var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;",
				"!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_FACTORY__ = (#), " +
				"__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? " +
				"(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), " +
				"__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))"
			],
			lf: ["var XXX;", "!(XXX = #.call(exports, __webpack_require__, exports, module))"],
			lo: ["var XXX;", "!(XXX = #)"],
			lof: [
				"var __WEBPACK_AMD_DEFINE_FACTORY__, XXX;",
				"!(__WEBPACK_AMD_DEFINE_FACTORY__ = (#), XXX = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? " +
				"(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__))"
			],
			laf: [
				"var __WEBPACK_AMD_DEFINE_ARRAY__, XXX;",
				"!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, XXX = (#.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)))"
			],
			lao: ["var XXX;", "!(#, XXX = #)"],
			laof: [
				"var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_FACTORY__, XXX;",
				"!(__WEBPACK_AMD_DEFINE_ARRAY__ = #, __WEBPACK_AMD_DEFINE_FACTORY__ = (#), " +
				"XXX = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? " +
				"(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__))"
			]
		};
		replace.apply(null, defs[branch]);
	}
}
class AMDDefineDependency extends NullDependency {
	constructor(range, arrayRange, functionRange, objectRange) {
		super();
		this.range = range;
		this.arrayRange = arrayRange;
		this.functionRange = functionRange;
		this.objectRange = objectRange;
	}
}
AMDDefineDependency.Template = Template;
AMDDefineDependency.prototype.type = "amd define";
module.exports = AMDDefineDependency;
