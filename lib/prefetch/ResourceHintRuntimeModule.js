/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/**
 * @typedef {object} ResourceHintRuntimeModulePluginHooks
 * @property {SyncWaterfallHook<[string]>} linkPrefetch
 * @property {SyncWaterfallHook<[string]>} linkPreload
 */

/** @type {WeakMap<Compilation, ResourceHintRuntimeModulePluginHooks>} */
const compilationHooksMap = new WeakMap();

/**
 * Maps a request/filename to the value of the `<link>` `as` attribute. Best
 * effort — falls back to `"fetch"` when the type cannot be guessed. Pattern
 * matches against the path part, ignoring any query string suffix.
 * @param {string} request request/filename
 * @returns {string} value for the `as` attribute
 */
const guessAsAttribute = (request) => {
	if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|tiff?)(\?.*)?$/i.test(request)) {
		return "image";
	}
	if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(request)) return "font";
	if (/\.css(\?.*)?$/i.test(request)) return "style";
	if (/\.[cm]?jsx?(\?.*)?$/i.test(request)) return "script";
	if (/\.[cm]?tsx?(\?.*)?$/i.test(request)) return "script";
	if (/\.(mp3|wav|flac|aac|m4a|ogg|oga)(\?.*)?$/i.test(request)) return "audio";
	if (/\.(mp4|webm|mkv|mov|m4v|ogv|avi)(\?.*)?$/i.test(request)) return "video";
	if (/\.vtt(\?.*)?$/i.test(request)) return "track";
	return "fetch";
};

class ResourceHintRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {ResourceHintRuntimeModulePluginHooks} hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				linkPrefetch: new SyncWaterfallHook(["source"]),
				linkPreload: new SyncWaterfallHook(["source"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {"prefetch" | "preload"} rel link rel value
	 */
	constructor(rel) {
		super(`asset ${rel}`, RuntimeModule.STAGE_ATTACH);
		this._rel = rel;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const { crossOriginLoading } = outputOptions;
		const isNeutralPlatform = runtimeTemplate.isNeutralPlatform();
		const rel = this._rel;
		const fnName =
			rel === "prefetch"
				? RuntimeGlobals.prefetchAsset
				: RuntimeGlobals.preloadAsset;
		const hook =
			ResourceHintRuntimeModule.getCompilationHooks(compilation)[
				rel === "prefetch" ? "linkPrefetch" : "linkPreload"
			];

		const body = [
			"if (installed[href]) return href;",
			"installed[href] = 1;",
			hook.call(
				Template.asString([
					"var link = document.createElement('link');",
					`link.rel = ${JSON.stringify(rel)};`,
					"link.href = href;",
					"if (as) link.as = as;",
					"if (type) link.type = type;",
					"if (media) link.media = media;",
					"if (fetchPriority) {",
					Template.indent([
						'link.setAttribute("fetchpriority", fetchPriority);'
					]),
					"}",
					`if (${RuntimeGlobals.scriptNonce}) {`,
					Template.indent(
						`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
					),
					"}",
					crossOriginLoading
						? crossOriginLoading === "use-credentials"
							? 'link.crossOrigin = "use-credentials";'
							: Template.asString([
									"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
									Template.indent(
										`link.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
									),
									"}"
								])
						: ""
				])
			),
			"document.head.appendChild(link);",
			"return href;"
		];

		const fnBody = isNeutralPlatform
			? ["if (typeof document === 'undefined') return href;", ...body]
			: body;

		// `Object.create(null)` keeps the dedupe map free of inherited
		// properties (`toString`, `__proto__`, …) so any URL string is a
		// safe key.
		return Template.asString([
			"var installed = Object.create(null);",
			`${fnName} = ${runtimeTemplate.basicFunction(
				"href, as, type, media, fetchPriority",
				fnBody
			)};`
		]);
	}
}

ResourceHintRuntimeModule.guessAsAttribute = guessAsAttribute;

module.exports = ResourceHintRuntimeModule;
