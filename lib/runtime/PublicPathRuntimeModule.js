/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../../declarations/WebpackOptions").PublicPath} PublicPath */
/** @typedef {import("../../declarations/WebpackOptions").ScriptType} ScriptType */
/** @typedef {import("../Compilation")} Compilation */

class PublicPathRuntimeModule extends RuntimeModule {
	/**
	 * @param {PublicPathRuntimeModule} module module
	 * @returns {ReadonlyArray<string> | null} requirements
	 */
	static getRuntimeRequirements(module) {
		if (module.publicPath !== "auto" || module.scriptType === "module")
			return null;

		return [RuntimeGlobals.global];
	}
	/**
	 * @param {PublicPath} publicPath public path
	 * @param {ScriptType} scriptType script type
	 */
	constructor(publicPath, scriptType) {
		super("publicPath");
		this.publicPath = publicPath;
		this.scriptType = scriptType;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation, publicPath, scriptType } = this;
		const { runtimeTemplate } = compilation;
		if (publicPath === "auto") {
			if (scriptType === "module") {
				return `${RuntimeGlobals.publicPath} = import.meta.url.replace(/[^\\/]+$/, "")`;
			}

			return `${RuntimeGlobals.publicPath} = ${runtimeTemplate.iife(
				"",
				Template.indent([
					`if ("document" in ${RuntimeGlobals.global} && "currentScript" in ${RuntimeGlobals.global}.document) `,
					Template.indent(
						`return ${RuntimeGlobals.global}.document.currentScript.src.replace(/[^\\/]+$/, "");`
					),
					" else ",
					Template.indent(`return ${this.definePath("")};`)
				])
			)}`;
		} else {
			return `${RuntimeGlobals.publicPath} = ${this.definePath(publicPath)};`;
		}
	}

	/**
	 * @param {PublicPath} publicPath public path
	 * @returns {string} runtime code
	 */
	definePath(publicPath) {
		return JSON.stringify(
			this.compilation.getPath(publicPath || "", {
				hash: this.compilation.hash || "XXXX"
			})
		);
	}
}

module.exports = PublicPathRuntimeModule;
