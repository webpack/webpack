/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class TrustedTypesRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("trusted types");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { runtimeTemplate, outputOptions } = compilation;
		const { trustedTypesPolicyName } = outputOptions;
		const fn = RuntimeGlobals.getTrustedTypesPolicy;

		return Template.asString([
			"var rules = {",
			Template.indent([
				"createScriptURL: function(input) {",
				Template.indent("return input;"),
				"}"
			]),
			"}",
			"var trustedTypesPolicy;",
			`${fn} = ${runtimeTemplate.basicFunction("", [
				"// Create trusted type policy if trusted types are enabled in global object and the policy doesn't exist yet.",
				"if (trustedTypesPolicy === undefined && typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {",
				Template.indent([
					`trustedTypesPolicy = trustedTypes.createPolicy(${JSON.stringify(
						trustedTypesPolicyName
					)}, rules)`
				]),
				"}",
				"",
				"if (trustedTypesPolicy) {",
				Template.indent("return trustedTypesPolicy"),
				"} else {",
				Template.indent("return rules"),
				"}"
			])};`
		]);
	}
}

module.exports = TrustedTypesRuntimeModule;
