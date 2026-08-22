/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @import Compilation from "../Compilation" */

/**
 * Fires `<link rel="prefetch">` / `<link rel="preload">` for every asset
 * referenced from this chunk via `new URL(..., import.meta.url)` carrying
 * `webpackPrefetch` / `webpackPreload`, at chunk startup. Runs before any
 * user module evaluates, so by the time user code reaches the
 * corresponding `new URL(...)` (or hands the URL to `<img>`, `fetch`,
 * `new Worker`, etc.), the browser already has the response in flight.
 *
 * The calls themselves are rendered by `ResourceHintPlugin`, while runtime
 * requirements are still open — see `collectStartupAssetHintLines`.
 */
class StartupAssetHintRuntimeModule extends RuntimeModule {
	/**
	 * @param {string[]} lines the `<link>` calls this chunk fires at startup
	 */
	constructor(lines) {
		super("startup asset hints", RuntimeModule.STAGE_TRIGGER);
		this._lines = lines;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const lines = this._lines;
		if (lines.length === 0) return null;
		// `__webpack_nonce__` set inside the entry module is too late — the
		// entry hasn't run yet. Read the nonce off the `<script>` tag that
		// loaded the bundle, so prefetch / preload links match a CSP that
		// demands the same nonce as the script.
		//
		// - For classic script output, `document.currentScript` is the
		//   loading `<script>` element while the runtime executes.
		// - For ESM output (`output.module: true`), `document.currentScript`
		//   is `null`; locate the loading `<script type="module">` by
		//   matching `script.src` against `import.meta.url`.
		const { module: isModule, importMetaName } = compilation.outputOptions;
		const nonceSetup = isModule
			? [
					"if (typeof document !== 'undefined') {",
					Template.indent([
						`var url = ${importMetaName}.url;`,
						"var scripts = document.getElementsByTagName('script');",
						"for (var i = 0; i < scripts.length; i++) {",
						Template.indent([
							`if (scripts[i].src === url && scripts[i].nonce && !${RuntimeGlobals.scriptNonce}) {`,
							Template.indent([
								`${RuntimeGlobals.scriptNonce} = scripts[i].nonce;`,
								"break;"
							]),
							"}"
						]),
						"}"
					]),
					"}"
				]
			: [
					"if (typeof document !== 'undefined') {",
					Template.indent([
						"var currentScript = document.currentScript;",
						`if (currentScript && currentScript.nonce && !${RuntimeGlobals.scriptNonce}) {`,
						Template.indent(
							`${RuntimeGlobals.scriptNonce} = currentScript.nonce;`
						),
						"}"
					]),
					"}"
				];
		return Template.asString([...nonceSetup, ...lines]);
	}
}

module.exports = StartupAssetHintRuntimeModule;
