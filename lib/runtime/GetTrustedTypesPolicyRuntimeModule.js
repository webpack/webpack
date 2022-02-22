/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class GetTrustedTypesPolicyRuntimeModule extends HelperRuntimeModule {
	/**
	 * @param {Set<string>} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("trusted types policy");
		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { runtimeTemplate, outputOptions } = compilation;
		const { trustedTypes } = outputOptions;
		const fn = RuntimeGlobals.getTrustedTypesPolicy;

		return Template.asString([
			"var policy;",
			`${fn} = ${runtimeTemplate.basicFunction("", [
				"// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.",
				"if (policy === undefined) {",
				Template.indent([
					"policy = {",
					Template.indent(
						[
							...(this.runtimeRequirements.has(RuntimeGlobals.createScript)
								? [
										`createScript: ${runtimeTemplate.returningFunction(
											"script",
											"script"
										)}`
								  ]
								: []),
							...(this.runtimeRequirements.has(RuntimeGlobals.createScriptUrl)
								? [
										`createScriptURL: ${runtimeTemplate.returningFunction(
											"url",
											"url"
										)}`
								  ]
								: [])
						].join(",\n")
					),
					"};",
					...(trustedTypes
						? [
								'if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {',
								Template.indent([
									`policy = trustedTypes.createPolicy(${JSON.stringify(
										trustedTypes.policyName
									)}, policy);`
								]),
								"}"
						  ]
						: [])
				]),
				"}",
				"return policy;"
			])};`
		]);
	}
}

module.exports = GetTrustedTypesPolicyRuntimeModule;
