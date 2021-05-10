/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class CreateScriptUrlRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("trusted types");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { runtimeTemplate, outputOptions } = compilation;
		const { trustedTypes } = outputOptions;
		const fn = RuntimeGlobals.createScriptUrl;

		if (!trustedTypes) {
			// Skip Trusted Types logic.
			return Template.asString([
				`${fn} = ${runtimeTemplate.returningFunction("url", "url")};`
			]);
		}

		return Template.asString([
			"var policy;",
			`${fn} = ${runtimeTemplate.basicFunction("url", [
				"// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.",
				"if (policy === undefined) {",
				Template.indent([
					"policy = {",
					Template.indent([
						`createScriptURL: ${runtimeTemplate.returningFunction(
							"url",
							"url"
						)}`
					]),
					"};",
					'if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {',
					Template.indent([
						`policy = trustedTypes.createPolicy(${JSON.stringify(
							trustedTypes.policyName
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

module.exports = CreateScriptUrlRuntimeModule;
