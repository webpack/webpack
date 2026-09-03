/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const {
	ASSET_URL_TYPE,
	JAVASCRIPT_TYPE
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const RawDataUrlModule = require("../asset/RawDataUrlModule");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const { toJsStringLiteral } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const {
	PUBLIC_PATH_AUTO,
	PUBLIC_PATH_FULL_HASH
} = require("../util/publicPathPlaceholder");
const ModuleDependency = require("./ModuleDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/**
 * @import Dependency, {
 * 	GetConditionFn,
 * 	UpdateHashContext
 * } from "../Dependency"
 */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import { EntryOptions } from "../Entrypoint" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import Hash from "../util/Hash" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @import { UsedByExports } from "../optimize/InnerGraph" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, boolean, EntryOptions | undefined, string | undefined, UsedByExports | undefined, true | undefined, true | undefined, ("high" | "low" | "auto" | undefined), string | undefined, string | undefined, string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, boolean, EntryOptions | undefined, string | undefined, UsedByExports | undefined, true | undefined, true | undefined, ("high" | "low" | "auto" | undefined), string | undefined, string | undefined, string | undefined]>} ObjectSerializerContext */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

/**
 * Resolves the static literal specifier (already quoted) for `new URL(<here>, import.meta.url)`,
 * or `null` when the asset url can't be determined statically (e.g. a runtime/dynamic publicPath).
 * @param {URLDependency} dep the dependency
 * @param {DependencyTemplateContext} templateContext the template context
 * @returns {string | null} a JS string literal, or `null` to fall back to the runtime form
 */
const getAnalyzableUrlSpecifier = (dep, templateContext) => {
	const {
		module: consumingModule,
		moduleGraph,
		chunkGraph,
		runtime,
		codeGenerationResults,
		runtimeTemplate
	} = templateContext;
	const assetModule = moduleGraph.getModule(dep);
	if (!assetModule || !codeGenerationResults.has(assetModule, runtime)) {
		return null;
	}
	const urlData = codeGenerationResults.getData(assetModule, runtime, "url");
	const jsUrl = urlData && urlData[JAVASCRIPT_TYPE];
	if (
		typeof jsUrl === "string" &&
		!jsUrl.includes(RuntimeGlobals.require) &&
		// An analyzable wrapper is an expression, not a value — quoting it would nest
		// one `new URL(…)` inside another. Its own literal is rebuilt below instead.
		!jsUrl.includes(runtimeTemplate.outputOptions.importMetaName)
	) {
		// An already-quoted literal (generator `publicPath` / data: url) is used as-is;
		// a raw value (external asset) is normalized to a quoted string.
		return jsUrl.startsWith('"') ? jsUrl : toJsStringLiteral(jsUrl);
	}
	if (urlData && jsUrl === undefined) {
		// Wrapper dropped for an `asset-url` consumer: an absolute public path resolves
		// the same url from every chunk, so it is already a literal.
		const assetUrl = urlData[ASSET_URL_TYPE];
		// A css or html consumer drops the wrapper too, and its value carries a
		// placeholder only those assets are rendered with — so use the name below.
		if (
			typeof assetUrl === "string" &&
			!assetUrl.includes(PUBLIC_PATH_AUTO) &&
			!assetUrl.includes(PUBLIC_PATH_FULL_HASH)
		) {
			return toJsStringLiteral(assetUrl);
		}
	}
	// The wrapper concatenates the runtime public path, or was dropped as unread —
	// either way the name is what the literal is built from.
	const filename = codeGenerationResults.getData(
		assetModule,
		runtime,
		"filename"
	);
	if (typeof filename !== "string") return null;
	return runtimeTemplate.getAnalyzableAssetUrl(
		consumingModule,
		chunkGraph,
		filename,
		runtime
	);
};

class URLDependency extends ModuleDependency {
	/**
	 * Creates an instance of URLDependency.
	 * @param {string} request request
	 * @param {Range} range range of the arguments of new URL( |> ... <| )
	 * @param {Range} outerRange range of the full |> new URL(...) <|
	 * @param {boolean=} relative use relative urls instead of absolute with base uri
	 * @param {EntryOptions=} entryOptions entry options from magic comments
	 */
	constructor(request, range, outerRange, relative, entryOptions) {
		super(request);
		this.range = range;
		this.outerRange = outerRange;
		/** @type {boolean} */
		this.relative = relative || false;
		/** @type {EntryOptions | undefined} */
		this.entryOptions = entryOptions;
		/** @type {string | undefined} */
		this.entryChunkFilenameGlobal = undefined;
		/** @type {UsedByExports | undefined} */
		this.usedByExports = undefined;
		/** @type {true | undefined} */
		this.prefetch = undefined;
		/** @type {true | undefined} */
		this.preload = undefined;
		/** @type {"high" | "low" | "auto" | undefined} */
		this.fetchPriority = undefined;
		/** @type {string | undefined} */
		this.asAttribute = undefined;
		/** @type {string | undefined} */
		this.typeAttribute = undefined;
		/** @type {string | undefined} */
		this.mediaAttribute = undefined;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		super.updateHash(hash, context);
		// Entry promotion picks getChunkCssFilename vs getChunkScriptFilename.
		if (this.entryChunkFilenameGlobal !== undefined) {
			hash.update(this.entryChunkFilenameGlobal);
		}
		const { runtimeTemplate, runtime } = context;
		// Only a baked url reads the base; the runtime form is the same text under every
		// base, so hashing one there would cost the code generation cache for nothing.
		if (
			runtimeTemplate === undefined ||
			this.relative ||
			!runtimeTemplate.analyzableUrlReadsBaseUri()
		) {
			return;
		}
		const base = runtimeTemplate.entryBaseUri(runtime);
		// Disagreeing entries keep the runtime form, different code again from the
		// base-less literal `undefined` bakes; an empty base must differ from both.
		if (base === null) hash.update("|");
		// Left out entirely where no entry sets one, so ordinary builds hash as before.
		else if (typeof base === "string") hash.update(`=${base}`);
	}

	get type() {
		return "new URL()";
	}

	get category() {
		return "url";
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return getDependencyUsedByExportsCondition(this, moduleGraph);
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredRawDataUrlModule();
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.outerRange)
			.write(this.relative)
			.write(this.entryOptions)
			.write(this.entryChunkFilenameGlobal)
			.write(this.usedByExports)
			.write(this.prefetch)
			.write(this.preload)
			.write(this.fetchPriority)
			.write(this.asAttribute)
			.write(this.typeAttribute)
			.write(this.mediaAttribute);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.outerRange = context.read();
		const c1 = context.rest;
		this.relative = c1.read();
		const c2 = c1.rest;
		this.entryOptions = c2.read();
		const c3 = c2.rest;
		this.entryChunkFilenameGlobal = c3.read();
		const c4 = c3.rest;
		this.usedByExports = c4.read();
		const c5 = c4.rest;
		this.prefetch = c5.read();
		const c6 = c5.rest;
		this.preload = c6.read();
		const c7 = c6.rest;
		this.fetchPriority = c7.read();
		const c8 = c7.rest;
		this.asAttribute = c8.read();
		const c9 = c8.rest;
		this.typeAttribute = c9.read();
		const c10 = c9.rest;
		this.mediaAttribute = c10.read();
		super.deserialize(c10.rest);
	}
}

URLDependency.Template = class URLDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtimeTemplate,
			codeGenerationResults,
			runtime
		} = templateContext;
		const dep = /** @type {URLDependency} */ (dependency);
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering depending when dependency is conditional
		if (connection && !connection.isTargetActive(runtime)) {
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				"/* unused asset import */ undefined"
			);
			return;
		}

		// Entry-block mode: promoted to an AsyncDependenciesBlock with entryOptions.
		const parentBlock = moduleGraph.getParentBlock(dep);
		const isEntryUrl =
			parentBlock instanceof AsyncDependenciesBlock &&
			parentBlock.groupOptions &&
			parentBlock.groupOptions.entryOptions;

		// ESM asset URLs stay as analyzable `new URL(…)`; relative/entry keep runtime form.
		if (
			!isEntryUrl &&
			!dep.relative &&
			runtimeTemplate.supportsAnalyzable(
				"url",
				chunkGraph,
				templateContext.module
			)
		) {
			const specifier = getAnalyzableUrlSpecifier(dep, templateContext);
			if (specifier !== null) {
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					`/* asset import */ ${specifier}, ${runtimeTemplate.outputOptions.importMetaName}.url`
				);
				return;
			}
		}

		/** @type {string} */
		let urlExpr;
		if (isEntryUrl) {
			const entrypoint =
				/** @type {import("../Entrypoint")} */
				(chunkGraph.getBlockChunkGroup(parentBlock));
			const chunk = entrypoint.getEntrypointChunk();
			const getChunkFilename =
				dep.entryChunkFilenameGlobal || RuntimeGlobals.getChunkScriptFilename;
			runtimeRequirements.add(RuntimeGlobals.publicPath);
			runtimeRequirements.add(getChunkFilename);
			urlExpr = `${
				RuntimeGlobals.publicPath
			} + ${getChunkFilename}(${JSON.stringify(chunk.id)})`;
		} else {
			const module = moduleGraph.getModule(dep);
			// A wrapper-less asset has no exports to require, so concatenate what the wrapper
			// would have — `AssetModulesPlugin` emulates the same for build-time execution.
			const wrapperLess =
				module !== null && !module.getSourceTypes().has(JAVASCRIPT_TYPE);
			const filename =
				wrapperLess && codeGenerationResults.has(module, runtime)
					? codeGenerationResults.getData(module, runtime, "filename")
					: undefined;
			if (wrapperLess && typeof filename === "string") {
				runtimeRequirements.add(RuntimeGlobals.publicPath);
				urlExpr = `${RuntimeGlobals.publicPath} + ${toJsStringLiteral(
					filename
				)}`;
			} else {
				runtimeRequirements.add(RuntimeGlobals.require);
				if (wrapperLess) runtimeRequirements.add(RuntimeGlobals.publicPath);
				urlExpr = runtimeTemplate.moduleRaw({
					chunkGraph,
					module,
					request: dep.request,
					runtimeRequirements,
					weak: false
				});
			}
		}

		const comment = isEntryUrl ? "entry url" : "asset import";

		if (dep.relative) {
			runtimeRequirements.add(RuntimeGlobals.relativeUrl);
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				`/* ${comment} */ new ${RuntimeGlobals.relativeUrl}(${urlExpr})`
			);
		} else {
			runtimeRequirements.add(RuntimeGlobals.baseURI);
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				`/* ${comment} */ ${urlExpr}, ${RuntimeGlobals.baseURI}`
			);
		}
	}
};

makeSerializable(URLDependency, "webpack/lib/dependencies/URLDependency");

module.exports = URLDependency;
