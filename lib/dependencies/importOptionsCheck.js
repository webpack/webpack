/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const Template = require("../Template");

/** @import RuntimeTemplate from "../RuntimeTemplate" */

/**
 * Wraps an import so its arguments evaluate in source order and the options are
 * checked, rejecting rather than throwing. The last parameter holds them.
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @param {string[]} parameters parameter names, the options one last
 * @param {string} content the import expression to return once the check passes
 * @returns {string} the wrapping function
 */
const importOptionsCheck = (runtimeTemplate, parameters, content) => {
	const options = parameters[parameters.length - 1];
	return runtimeTemplate.basicFunction(parameters.join(", "), [
		"try {",
		Template.indent([
			`if (${options} !== undefined) {`,
			Template.indent([
				`if ((typeof ${options} !== "object" && typeof ${options} !== "function") || ${options} === null) throw new TypeError("The second argument to import() must be an object");`,
				`var a = ${options}["with"];`,
				"if (a !== undefined) {",
				Template.indent([
					'if ((typeof a !== "object" && typeof a !== "function") || a === null) throw new TypeError("The \'with\' option must be an object");',
					"for (var k = Object.keys(a), i = 0; i < k.length; i++) {",
					Template.indent([
						'if (typeof a[k[i]] !== "string") throw new TypeError("Import attribute values must be strings");'
					]),
					"}"
				]),
				"}"
			]),
			"}"
		]),
		"} catch (e) { return Promise.reject(e); }",
		`return ${content};`
	]);
};

module.exports = importOptionsCheck;
