/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

// eslint-disable-next-line import/default -- CJS package, default is module.exports
import t from "@webassemblyjs/ast";
import { decode } from "@webassemblyjs/wasm-parser";
import Parser from "../Parser.js";
import StaticExportsDependency from "../dependencies/StaticExportsDependency.js";
import WebAssemblyImportDependency from "../dependencies/WebAssemblyImportDependency.js";
import EnvironmentNotSupportAsyncWarning from "../errors/EnvironmentNotSupportAsyncWarning.js";
/** @typedef {import("./AsyncWasmModule.js").default} AsyncWasmModule */
/** @typedef {import("../Module.js").BuildInfo} BuildInfo */
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule.js").default} NormalModule */
/** @typedef {import("../Parser.js").ParserState} ParserState */
/** @typedef {import("../Parser.js").PreparsedAst} PreparsedAst */

const WASM_HEADER = Buffer.from([0x00, 0x61, 0x73, 0x6d]);

const decoderOpts = {
	ignoreCodeSection: true,
	ignoreDataSection: true,

	// this will avoid having to lookup with identifiers in the ModuleContext
	ignoreCustomNameSection: true
};

class WebAssemblyParser extends Parser {
	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (!Buffer.isBuffer(source)) {
			throw new Error("WebAssemblyParser input must be a Buffer");
		}

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);
		buildMeta.exportsType = "namespace";
		buildMeta.async = true;

		EnvironmentNotSupportAsyncWarning.check(
			state.module,
			state.compilation.runtimeTemplate,
			"asyncWebAssembly"
		);

		// flag it as async module
		const buildInfo = /** @type {BuildInfo} */ (state.module.buildInfo);

		buildInfo.strict = true;

		if (/** @type {AsyncWasmModule} */ (state.module).phase === "source") {
			// For source phase, only validate magic header
			if (source.length < 4 || !source.subarray(0, 4).equals(WASM_HEADER)) {
				throw new Error(
					"Source phase imports require valid WebAssembly modules. Invalid magic header (expected \\0asm)."
				);
			}

			// Source phase exports the WebAssembly.Module as default
			state.module.addDependency(
				new StaticExportsDependency(["default"], false)
			);

			// Skip full parsing - no exports/imports needed for source phase
			return state;
		}

		// parse it
		const program = decode(source, decoderOpts);
		const module = program.body[0];
		/** @type {string[]} */
		const exports = [];

		t.traverse(module, {
			ModuleExport({ node }) {
				exports.push(node.name);
			},

			ModuleImport({ node }) {
				const dep = new WebAssemblyImportDependency(
					node.module,
					node.name,
					node.descr,
					false
				);

				state.module.addDependency(dep);
			}
		});

		state.module.addDependency(new StaticExportsDependency(exports, false));

		return state;
	}
}

export default WebAssemblyParser;

export { WebAssemblyParser as "module.exports" };
