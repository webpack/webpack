/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../../declarations/WebpackOptions").Output} OutputOptions */
/** @typedef {import("../../declarations/WebpackOptions").PublicPath} PublicPathOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

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
	 * @param {OutputOptions} outputOptions output options
	 * @param {string=} undoPath undo path
	 */
	constructor(outputOptions, undoPath) {
		super("publicPath");
		const { publicPath, scriptType, importFunctionName } = outputOptions;
		this.publicPath = publicPath;
		this.scriptType = scriptType;
		this.importName = importFunctionName;
		this.undoPath = undoPath;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation, importName, publicPath, scriptType } = this;
		const { runtimeTemplate } = compilation;
		if (publicPath === "auto") {
			if (scriptType === "module") {
				return `${RuntimeGlobals.publicPath} = ${this.applyUndoPath(
					`${importName}.meta.url.replace(/[^\\/]+$/, "")`,
					runtimeTemplate
				)};`;
			}

			return `${RuntimeGlobals.publicPath} = ${runtimeTemplate.iife(
				"",
				Template.indent([
					`if ("document" in ${RuntimeGlobals.global} && "currentScript" in ${RuntimeGlobals.global}.document) `,
					Template.indent(
						`return ${this.applyUndoPath(
							`${RuntimeGlobals.global}.document.currentScript.src.replace(/[^\\/]+$/, "")`,
							runtimeTemplate
						)};`
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
	 * @param {PublicPathOptions} publicPath public path
	 * @returns {string} runtime code
	 */
	definePath(publicPath) {
		return JSON.stringify(
			this.compilation.getPath(publicPath || "", {
				hash: this.compilation.hash || "XXXX"
			})
		);
	}

	/**
	 * @param {string} code code
	 * @param {RuntimeTemplate} runtimeTemplate runtime template
	 * @returns {string} generated code
	 */
	applyUndoPath(code, runtimeTemplate) {
		const { undoPath } = this;
		if (!undoPath) return code;

		if (runtimeTemplate.supportTemplateLiteral()) {
			return `\`$\{${code}}${undoPath}\``;
		}

		return `${code} + "${undoPath}"`;
	}
}

module.exports = PublicPathRuntimeModule;
