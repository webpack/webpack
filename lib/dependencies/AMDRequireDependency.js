/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");
const DepBlockHelpers = require("./DepBlockHelpers");

class AMDRequireDependency extends NullDependency {
	constructor(block) {
		super();
		this.block = block;
	}
}

AMDRequireDependency.Template = class AMDRequireDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const depBlock = dep.block;
		const wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, "require");

		// has array range but no function range
		if(depBlock.arrayRange && !depBlock.functionRange) {
			const startBlock = wrapper[0] + "function() {";
			const endBlock = `;}${wrapper[1]}__webpack_require__.oe${wrapper[2]}`;
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1, startBlock);
			source.replace(depBlock.arrayRange[1], depBlock.outerRange[1] - 1, endBlock);
			return;
		}

		// has function range but no array range
		if(depBlock.functionRange && !depBlock.arrayRange) {
			const startBlock = wrapper[0] + "function() {(";
			const endBlock = `.call(exports, __webpack_require__, exports, module));}${wrapper[1]}__webpack_require__.oe${wrapper[2]}`;
			source.replace(depBlock.outerRange[0], depBlock.functionRange[0] - 1, startBlock);
			source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, endBlock);
			return;
		}

		// has array range, function range, and errorCallbackRange
		if(depBlock.arrayRange && depBlock.functionRange && depBlock.errorCallbackRange) {
			const startBlock = wrapper[0] + "function() { ";
			const errorRangeBlock = `}${depBlock.functionBindThis ? ".bind(this)" : ""}${wrapper[1]}`;
			const endBlock = `${depBlock.errorCallbackBindThis ? ".bind(this)" : ""}${wrapper[2]}`;

			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1, startBlock);
			source.insert(depBlock.arrayRange[0] + 0.9, "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
			source.replace(depBlock.arrayRange[1], depBlock.functionRange[0] - 1, "; ((");
			source.insert(depBlock.functionRange[1], ").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));");
			source.replace(depBlock.functionRange[1], depBlock.errorCallbackRange[0] - 1, errorRangeBlock);
			source.replace(depBlock.errorCallbackRange[1], depBlock.outerRange[1] - 1, endBlock);
			return;
		}

		// has array range, function range, but no errorCallbackRange
		if(depBlock.arrayRange && depBlock.functionRange) {
			const startBlock = wrapper[0] + "function() { ";
			const endBlock = `}${depBlock.functionBindThis ? ".bind(this)" : ""}${wrapper[1]}__webpack_require__.oe${wrapper[2]}`;
			source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1, startBlock);
			source.insert(depBlock.arrayRange[0] + 0.9, "var __WEBPACK_AMD_REQUIRE_ARRAY__ = ");
			source.replace(depBlock.arrayRange[1], depBlock.functionRange[0] - 1, "; ((");
			source.insert(depBlock.functionRange[1], ").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));");
			source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, endBlock);
		}
	}
};

module.exports = AMDRequireDependency;
