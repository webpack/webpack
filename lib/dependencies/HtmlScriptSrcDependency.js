/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CssUrlDependency = require("./CssUrlDependency");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/** @typedef {"script-classic" | "script-module" | "modulepreload"} HtmlScriptElementKind */

class HtmlScriptSrcDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlScriptSrcDependency.
	 * @param {string} request request
	 * @param {Range} range range of the attribute value in the source
	 * @param {string} entryName name of the entry this script src is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 * @param {HtmlScriptElementKind=} elementKind shape of the originating HTML element; used when expanding sibling tags for split/runtime chunks
	 * @param {number=} tagStart position of the opening `<` of the originating tag in the source; sibling tags emitted for additional entry chunks are inserted right before this
	 */
	constructor(request, range, entryName, category, elementKind, tagStart) {
		super(request);
		this.range = range;
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
		/** @type {HtmlScriptElementKind} */
		this.elementKind = elementKind || "script-classic";
		/** @type {number} */
		this.tagStart = tagStart === undefined ? -1 : tagStart;
	}

	get type() {
		return "html script src";
	}

	get category() {
		return this._category;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.entryName);
		write(this._category);
		write(this.elementKind);
		write(this.tagStart);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.entryName = read();
		this._category = read();
		this.elementKind = read();
		this.tagStart = read();
		super.deserialize(context);
	}
}

/**
 * @param {Chunk} chunk a chunk
 * @param {import("../Compilation")} compilation compilation
 * @returns {string} chunk filename path (no public-path prefix)
 */
const getChunkFilename = (chunk, compilation) => {
	const outputOptions = compilation.outputOptions;
	const filenameTemplate =
		chunk.filenameTemplate ||
		(chunk.canBeInitial()
			? outputOptions.filename
			: outputOptions.chunkFilename);

	return compilation.getPath(filenameTemplate, {
		chunk,
		contentHashType: "javascript"
	});
};

/**
 * @param {Entrypoint} entrypoint entrypoint
 * @returns {Chunk[]} every chunk this entrypoint needs in load order: the
 * runtime chunk first (when `optimization.runtimeChunk` splits it off), then
 * any intermediate chunks (e.g. from `optimization.splitChunks`), and finally
 * the entry chunk itself. The entry chunk is always returned last so callers
 * can identify it as the tag whose `src`/`href` attribute is being rewritten
 * in place. Chunks that are already the entry chunk of a `dependOn` parent
 * entrypoint are skipped — those have their own `<script src>` tags
 * elsewhere in the HTML and would be loaded twice if included here.
 */
const getEntrypointChunksInLoadOrder = (entrypoint) => {
	const entryChunk = /** @type {Chunk} */ (entrypoint.getEntrypointChunk());
	const runtimeChunk = entrypoint.getRuntimeChunk();

	// Chunks already loaded by some other entrypoint's own script/link tag —
	// don't re-emit them. Walk the dependOn graph by following parent chunk
	// groups; only Entrypoint parents matter here since regular split chunks
	// aren't independent entrypoints.
	/** @type {Set<Chunk>} */
	const parentEntryChunks = new Set();
	/** @type {Set<import("../ChunkGroup")>} */
	const visitedGroups = new Set();
	const walk = (/** @type {import("../ChunkGroup")} */ group) => {
		if (visitedGroups.has(group)) return;
		visitedGroups.add(group);
		for (const parent of group.parentsIterable) {
			if (
				typeof (/** @type {Entrypoint} */ (parent).getEntrypointChunk) ===
				"function"
			) {
				const parentEntry =
					/** @type {Entrypoint} */
					(parent).getEntrypointChunk();
				if (parentEntry) parentEntryChunks.add(parentEntry);
			}
			walk(parent);
		}
	};
	walk(entrypoint);

	/** @type {Chunk[]} */
	const ordered = [];
	/** @type {Set<Chunk>} */
	const seen = new Set();
	const push = (/** @type {Chunk | null | undefined} */ chunk) => {
		if (!chunk || seen.has(chunk) || chunk === entryChunk) return;
		if (parentEntryChunks.has(chunk)) return;
		seen.add(chunk);
		ordered.push(chunk);
	};
	if (runtimeChunk !== entryChunk) {
		push(runtimeChunk);
	}
	for (const chunk of entrypoint.chunks) {
		push(chunk);
	}
	ordered.push(entryChunk);
	return ordered;
};

HtmlScriptSrcDependency.Template = class HtmlScriptSrcDependencyTemplate extends (
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
		const { runtimeTemplate } = templateContext;
		const dep = /** @type {HtmlScriptSrcDependency} */ (dependency);
		const compilation = runtimeTemplate.compilation;
		const entrypoint = /** @type {Entrypoint | undefined} */ (
			compilation.entrypoints.get(dep.entryName)
		);

		if (!entrypoint) {
			source.replace(dep.range[0], dep.range[1] - 1, "data:,");
			return;
		}

		const orderedChunks = getEntrypointChunksInLoadOrder(entrypoint);
		const entryChunk = orderedChunks[orderedChunks.length - 1];
		const entryUrl = `${CssUrlDependency.PUBLIC_PATH_AUTO}${getChunkFilename(
			entryChunk,
			compilation
		)}`;
		source.replace(dep.range[0], dep.range[1] - 1, entryUrl);

		// When the entrypoint has more than one chunk (e.g. `optimization.runtimeChunk`
		// or `splitChunks` pulled the runtime / shared code into their own chunks),
		// the browser must load every chunk in dependency order, not just the entry
		// chunk. Emit a sibling tag for each non-entry chunk, matching the shape of
		// the original tag (classic script, module script, or modulepreload link),
		// inserted before the original tag's `<` so they execute first.
		if (orderedChunks.length > 1 && dep.tagStart >= 0) {
			const siblings = [];
			for (let i = 0; i < orderedChunks.length - 1; i++) {
				const url = `${CssUrlDependency.PUBLIC_PATH_AUTO}${getChunkFilename(
					orderedChunks[i],
					compilation
				)}`;
				switch (dep.elementKind) {
					case "modulepreload":
						siblings.push(`<link rel="modulepreload" href="${url}">`);
						break;
					case "script-module":
						siblings.push(`<script type="module" src="${url}"></script>`);
						break;
					default:
						siblings.push(`<script src="${url}"></script>`);
				}
			}
			source.insert(dep.tagStart, siblings.join(""));
		}
	}
};

makeSerializable(
	HtmlScriptSrcDependency,
	"webpack/lib/dependencies/HtmlScriptSrcDependency"
);

module.exports = HtmlScriptSrcDependency;
