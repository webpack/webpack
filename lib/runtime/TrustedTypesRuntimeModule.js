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
		const fn = RuntimeGlobals.createScriptURL;

		return Template.asString([
			"var policy;",
			`${fn} = ${runtimeTemplate.basicFunction("url", [
				"// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.",
				"if (typeof policy === 'undefined') {",
				Template.indent([
					"policy = {",
					Template.indent([
						"createScriptURL: function(url) {",
						Template.indent("return url;"),
						"}"
					]),
					"};",
					"if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {",
					Template.indent([
						`policy = trustedTypes.createPolicy(${JSON.stringify(
							trustedTypesPolicyName
						)}, policy);`
					]),
					"}"
				]),
				"}",
				"return policy.createScriptURL(url);"
			])};`
		]);
	}
}

module.exports = TrustedTypesRuntimeModule;
