/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @import Chunk from "../Chunk" */
/** @import ChunkGraph from "../ChunkGraph" */
/** @import Compilation from "../Compilation" */

class AutoPublicPathRuntimeModule extends RuntimeModule {
	constructor() {
		super("publicPath", RuntimeModule.STAGE_BASIC);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		// The virtual build-time chunk has no script url and sits at the output
		// root, so urls resolve against the `importModule` baseUri.
		if (/** @type {ChunkGraph} */ (this.chunkGraph).buildTimeExecution) {
			return `${RuntimeGlobals.publicPath} = "";`;
		}
		const { scriptType, importMetaName, environment } =
			compilation.outputOptions;
		const chunk = /** @type {Chunk} */ (this.chunk);
		const undoPath = compilation.runtimeTemplate.chunkRootOutputDir(
			chunk,
			false
		);

		const global = environment.globalThis
			? "globalThis"
			: RuntimeGlobals.global;

		const entryOptions = chunk.getEntryOptions();
		// A worklet chunk is always loaded as a module via `addModule`, so it can
		// read `import.meta.url` directly instead of the worker-scope detection.
		const fromImportMeta =
			scriptType === "module" || Boolean(entryOptions && entryOptions.worklet);

		const runtimeTemplate = compilation.runtimeTemplate;
		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		return Template.asString([
			`${lt} scriptUrl;`,
			fromImportMeta
				? `if (typeof ${importMetaName}.url === "string") scriptUrl = ${importMetaName}.url`
				: Template.asString([
						`if (${global}.importScripts) scriptUrl = ${global}.location + "";`,
						`${cst} document = ${global}.document;`,
						"if (!scriptUrl && document) {",
						Template.indent([
							// Technically we could use `document.currentScript instanceof window.HTMLScriptElement`,
							// but an attacker could try to inject `<script>HTMLScriptElement = HTMLImageElement</script>`
							// and use `<img name="currentScript" src="https://attacker.controlled.server/"></img>`
							`if (${runtimeTemplate.optionalChaining(
								"document.currentScript",
								"tagName.toUpperCase() === 'SCRIPT'"
							)})`,
							Template.indent("scriptUrl = document.currentScript.src;"),
							"if (!scriptUrl) {",
							Template.indent([
								`${cst} scripts = document.getElementsByTagName("script");`,
								"if(scripts.length) {",
								Template.indent([
									`${lt} i = scripts.length - 1;`,
									"while (i > -1 && (!scriptUrl || !/^https?:/.test(scriptUrl))) scriptUrl = scripts[i--].src;"
								]),
								"}"
							]),
							"}"
						]),
						"}"
					]),
			"// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration",
			'// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.',
			'if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");',
			// One pass for the `blob:` prefix and the query/fragment: both stop at the
			// first `?` or `#`, so stripping either first leaves the same url.
			'scriptUrl = scriptUrl.replace(/^blob:|[?#].*$/g, "").replace(/\\/[^/]+$/, "/");',
			!undoPath
				? `${RuntimeGlobals.publicPath} = scriptUrl;`
				: `${RuntimeGlobals.publicPath} = scriptUrl + ${JSON.stringify(
						undoPath
					)};`
		]);
	}
}

module.exports = AutoPublicPathRuntimeModule;
