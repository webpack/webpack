/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class CreateScriptBlobRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("create script blob");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.createScriptBlob;

		return Template.asString([
			`${fn} = ${runtimeTemplate.basicFunction("code", [
				"try {",
				Template.indent(
					`return URL.createObjectURL(new Blob([code], { type: "application/javascript" }));`
				),
				`} catch (e) {`,
				Template.indent(
					`return new URL("data:application/javascript," + encodeURIComponent(code));`
				),
				"}"
			])}`
		]);
	}
}

module.exports = CreateScriptBlobRuntimeModule;
