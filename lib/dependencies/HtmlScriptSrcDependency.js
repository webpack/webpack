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

/** @typedef {"script-classic" | "script-module" | "modulepreload" | "stylesheet"} HtmlScriptElementKind */

class HtmlScriptSrcDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlScriptSrcDependency.
	 * @param {string} request request
	 * @param {Range} range range of the attribute value in the source
	 * @param {string} entryName name of the entry this script src is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 * @param {HtmlScriptElementKind=} elementKind shape of the originating HTML element; used when expanding sibling tags for split/runtime chunks
	 * @param {number=} tagStart position of the opening `<` of the originating tag in the source; sibling tags emitted for additional entry chunks are inserted right before this
	 * @param {number=} tagOpenEnd position of the character immediately after the opening tag's `>` in the source; combined with `tagStart` this lets the template clone the original opening tag verbatim (preserving attributes like `nonce`, `crossorigin`, `referrerpolicy`, `defer`, `async`) when generating sibling tags
	 */
	constructor(
		request,
		range,
		entryName,
		category,
		elementKind,
		tagStart,
		tagOpenEnd
	) {
		super(request);
		this.range = range;
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
		/** @type {HtmlScriptElementKind} */
		this.elementKind = elementKind || "script-classic";
		/** @type {number} */
		this.tagStart = tagStart === undefined ? -1 : tagStart;
		/** @type {number} */
		this.tagOpenEnd = tagOpenEnd === undefined ? -1 : tagOpenEnd;
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
		write(this.tagOpenEnd);
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
		this.tagOpenEnd = read();
		super.deserialize(context);
	}
}

/**
 * @param {Chunk} chunk a chunk
 * @param {import("../Compilation")} compilation compilation
 * @param {"javascript" | "css"} contentHashType which content hash to plug into the filename template
 * @returns {string} chunk filename path (no public-path prefix)
 */
const getChunkFilename = (chunk, compilation, contentHashType) => {
	const outputOptions = compilation.outputOptions;
	let filenameTemplate;
	if (contentHashType === "css") {
		// For a CSS-typed chunk, use the same template the CSS pipeline
		// will use when it actually emits the `.css` file, so the `<link
		// rel="stylesheet" href>` URL we write into the HTML matches the
		// asset on disk.
		filenameTemplate =
			require("../css/CssModulesPlugin").getChunkFilenameTemplate(
				chunk,
				outputOptions
			);
	} else {
		filenameTemplate =
			chunk.filenameTemplate ||
			(chunk.canBeInitial()
				? outputOptions.filename
				: outputOptions.chunkFilename);
	}

	return compilation.getPath(filenameTemplate, {
		chunk,
		contentHashType
	});
};

/**
 * @param {Entrypoint} entrypoint entrypoint
 * @returns {Chunk[]} every chunk this entrypoint needs in load order: the
 * runtime chunk first (when `optimization.runtimeChunk` splits it off), then
 * any intermediate chunks (e.g. from `optimization.splitChunks`), and finally
 * the entry chunk itself. The entry chunk is always returned last so callers
 * can identify it as the tag whose `src`/`href` attribute is being rewritten
 * in place. Chunks that are already loaded by an ancestor (`dependOn`) entry's
 * own script tag — i.e. the parent entrypoint's entry chunk *and* its runtime
 * chunk — are skipped, otherwise they would be loaded twice when the same
 * HTML contains tags for both the leader and the dependant entries.
 */
const getEntrypointChunksInLoadOrder = (entrypoint) => {
	const entryChunk = /** @type {Chunk} */ (entrypoint.getEntrypointChunk());
	const runtimeChunk = entrypoint.getRuntimeChunk();

	/** @type {Set<Chunk>} */
	const chunksLoadedByAncestorTags = new Set();
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
				if (parentEntry) chunksLoadedByAncestorTags.add(parentEntry);
				const parentRuntime =
					/** @type {Entrypoint} */
					(parent).getRuntimeChunk();
				if (parentRuntime) chunksLoadedByAncestorTags.add(parentRuntime);
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
		if (chunksLoadedByAncestorTags.has(chunk)) return;
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

/**
 * Clone the original `<script>`/`<link>` opening tag with its `src`/`href`
 * value swapped for a different chunk URL. Reusing the source text verbatim
 * preserves attributes such as `nonce`, `crossorigin`, `referrerpolicy`,
 * `defer`, and `async` so the sibling tags load with the same semantics as
 * the entry tag that's already there. `integrity` is dropped because it's
 * content-specific. When the original tag was upgraded to a module script
 * (either by the author or by the `output.module` auto-upgrade in
 * `HtmlParser`), the sibling is forced to `type="module"` regardless of what
 * the source originally said.
 * @param {string} originalTag the opening tag's source text including `>`
 * @param {number} srcStartInTag offset of the src/href value start within `originalTag`
 * @param {number} srcEndInTag offset of the src/href value end within `originalTag`
 * @param {string} newUrl URL to put into the cloned tag's src/href slot
 * @param {HtmlScriptElementKind} elementKind shape of the originating tag
 * @returns {string} the sibling tag's HTML (including a closing `</script>` for script tags)
 */
const cloneTagWithUrl = (
	originalTag,
	srcStartInTag,
	srcEndInTag,
	newUrl,
	elementKind
) => {
	let body =
		originalTag.slice(0, srcStartInTag) +
		newUrl +
		originalTag.slice(srcEndInTag);

	// Strip dangerous-to-copy attributes from the cloned tag — currently
	// just `integrity`. The match handles all three quoting styles
	// (`"…"`, `'…'`, unquoted) and the bare-attribute form.
	body = body.replace(
		/\s+integrity(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=[\s/>])/gi,
		""
	);

	if (elementKind === "script-module") {
		if (/\stype\s*=/i.test(body)) {
			body = body.replace(
				/(\stype\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
				'$1"module"'
			);
		} else {
			body = body.replace(/^<script\b/i, '<script type="module"');
		}
	}

	// `<link>` is a void element — no closing tag. `<script>` needs `</script>`.
	return elementKind === "modulepreload" || elementKind === "stylesheet"
		? body
		: `${body}</script>`;
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
		const contentHashType =
			dep.elementKind === "stylesheet" ? "css" : "javascript";
		const entryUrl = `${CssUrlDependency.PUBLIC_PATH_AUTO}${getChunkFilename(
			entryChunk,
			compilation,
			contentHashType
		)}`;
		source.replace(dep.range[0], dep.range[1] - 1, entryUrl);

		if (
			orderedChunks.length <= 1 ||
			dep.tagStart < 0 ||
			dep.tagOpenEnd <= dep.tagStart
		) {
			return;
		}

		// The browser must load every chunk in dependency order, not just the
		// entry chunk. Clone the original tag for each non-entry chunk so the
		// preserved attributes (nonce, crossorigin, …) match the entry tag,
		// and insert the clones before the original tag's `<`.
		const originalContent = /** @type {string} */ (source.original().source());
		const originalTag = originalContent.slice(dep.tagStart, dep.tagOpenEnd);
		const srcStartInTag = dep.range[0] - dep.tagStart;
		const srcEndInTag = dep.range[1] - dep.tagStart;

		const siblings = [];
		for (let i = 0; i < orderedChunks.length - 1; i++) {
			const url = `${CssUrlDependency.PUBLIC_PATH_AUTO}${getChunkFilename(
				orderedChunks[i],
				compilation,
				contentHashType
			)}`;
			siblings.push(
				cloneTagWithUrl(
					originalTag,
					srcStartInTag,
					srcEndInTag,
					url,
					dep.elementKind
				)
			);
		}
		source.insert(dep.tagStart, siblings.join(""));
	}
};

makeSerializable(
	HtmlScriptSrcDependency,
	"webpack/lib/dependencies/HtmlScriptSrcDependency"
);

module.exports = HtmlScriptSrcDependency;
