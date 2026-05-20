/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { CSS_TYPE, JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const CssUrlDependency = require("./CssUrlDependency");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
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
 * @param {Chunk} chunk chunk
 * @param {ChunkGraph} chunkGraph chunk graph
 * @returns {boolean} true if the chunk has any JavaScript modules
 */
const chunkHasJs = (chunk, chunkGraph) =>
	Boolean(
		chunkGraph.getChunkModulesIterableBySourceType(chunk, JAVASCRIPT_TYPE)
	);

/**
 * @param {Chunk} chunk chunk
 * @param {ChunkGraph} chunkGraph chunk graph
 * @returns {boolean} true if the chunk has any CSS modules
 */
const chunkHasCss = (chunk, chunkGraph) =>
	// Mirrors `CssModulesPlugin.chunkHasCss` (we don't reuse it directly
	// to avoid a hard dep from the dependency template on the css plugin
	// for non-css builds).
	Boolean(chunkGraph.getChunkModulesIterableBySourceType(chunk, CSS_TYPE));

/**
 * Smallest post-order index among the CSS modules of a chunk, taken
 * from the entrypoint's view of the dependency graph. Used to sort
 * sibling CSS chunks so they appear in source import order in the
 * extracted HTML — `entrypoint.chunks` itself does not give that
 * ordering for arbitrary splitChunks layouts.
 * @param {Chunk} chunk chunk
 * @param {Entrypoint} entrypoint entrypoint the chunk belongs to
 * @param {ChunkGraph} chunkGraph chunk graph
 * @returns {number} the lowest post-order index of any CSS module in
 * the chunk, or `Number.POSITIVE_INFINITY` when no CSS module has a
 * defined index (e.g. for a module the entrypoint never reached on its
 * own dependency walk — runtime-only modules, modules reached via
 * `dependOn`, etc.) so such chunks sort last among CSS chunks
 */
const firstCssModulePostOrderIndex = (chunk, entrypoint, chunkGraph) => {
	let min = Number.POSITIVE_INFINITY;
	const modules = chunkGraph.getChunkModulesIterableBySourceType(
		chunk,
		CSS_TYPE
	);
	if (!modules) return min;
	for (const module of modules) {
		const idx = entrypoint.getModulePostOrderIndex(module);
		if (idx !== undefined && idx < min) min = idx;
	}
	return min;
};

const COPYABLE_LINK_ATTRS = ["nonce", "crossorigin", "referrerpolicy"];

/**
 * Build a fresh `<link rel="stylesheet" href="…">` for a CSS chunk that
 * was pulled in by a `<script src>` entry — the originating tag was a
 * `<script>`, but the chunk is CSS so cloning the script tag verbatim
 * would produce nonsense (`<script src="…\.css">`). Copy
 * `nonce`/`crossorigin`/`referrerpolicy` from the original element so
 * the same CSP and fetch policy applies; `defer`/`async`/`type` have no
 * meaning on `<link>` and are dropped.
 * @param {string} originalTag the originating `<script>`/`<link>` tag's source text
 * @param {string} href URL for the stylesheet
 * @returns {string} the sibling `<link>` tag's HTML
 */
const buildStylesheetLink = (originalTag, href) => {
	let extra = "";
	for (const attr of COPYABLE_LINK_ATTRS) {
		// Match ` <attr>`, ` <attr>=value`, ` <attr>="value"`, ` <attr>='value'`.
		const re = new RegExp(
			`\\s${attr}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=[\\s/>])`,
			"i"
		);
		const m = originalTag.match(re);
		if (m) extra += m[0];
	}
	const safeHref = href.replace(/"/g, "&quot;");
	return `<link rel="stylesheet" href="${safeHref}"${extra}>`;
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
		const { chunkGraph } = compilation;
		const entrypoint = /** @type {Entrypoint | undefined} */ (
			compilation.entrypoints.get(dep.entryName)
		);

		if (!entrypoint) {
			source.replace(dep.range[0], dep.range[1] - 1, "data:,");
			return;
		}

		const orderedChunks = getEntrypointChunksInLoadOrder(entrypoint);
		const entryChunk = orderedChunks[orderedChunks.length - 1];
		const isStylesheet = dep.elementKind === "stylesheet";

		// Rewrite the originating tag's src/href to the entry chunk's
		// primary asset for that element kind: `.css` for
		// `<link rel="stylesheet">`, `.js` for everything else.
		const entryContentHashType = isStylesheet ? "css" : "javascript";
		const entryUrl = `${CssUrlDependency.PUBLIC_PATH_AUTO}${getChunkFilename(
			entryChunk,
			compilation,
			entryContentHashType
		)}`;
		source.replace(dep.range[0], dep.range[1] - 1, entryUrl);

		if (dep.tagStart < 0 || dep.tagOpenEnd <= dep.tagStart) {
			return;
		}

		// The browser must load every chunk the entry needs, not just the
		// entry chunk. For `<script>` entries that's the JS for sibling
		// chunks plus — critically — the CSS for any chunk that holds
		// stylesheets imported transitively from the JS source. Previously
		// every sibling was cloned as a `<script>` pointing at a `.js`
		// filename, so CSS chunks ended up as `<script src="foo.css">`
		// pointing at non-existent `.js` files (the bug in
		// html-webpack-plugin#1838 / webpack/mini-css-extract-plugin#959,
		// magnified here because the entry chunk's own CSS was emitted to
		// disk but never linked from the HTML at all).
		const originalContent = /** @type {string} */ (source.original().source());
		const originalTag = originalContent.slice(dep.tagStart, dep.tagOpenEnd);
		const srcStartInTag = dep.range[0] - dep.tagStart;
		const srcEndInTag = dep.range[1] - dep.tagStart;

		/**
		 * @param {Chunk} chunk chunk to emit a sibling tag for
		 * @param {"javascript" | "css"} kind content type slice of the chunk to emit
		 * @returns {string} a single sibling tag's HTML
		 */
		const buildSibling = (chunk, kind) => {
			const url = `${CssUrlDependency.PUBLIC_PATH_AUTO}${getChunkFilename(
				chunk,
				compilation,
				kind
			)}`;
			if (kind === "css" && !isStylesheet) {
				// Originating tag is `<script>` (or `<link rel=modulepreload>`)
				// but this chunk is CSS — emit a fresh `<link>` rather than
				// cloning the script.
				return buildStylesheetLink(originalTag, url);
			}
			return cloneTagWithUrl(
				originalTag,
				srcStartInTag,
				srcEndInTag,
				url,
				dep.elementKind
			);
		};

		const siblings = [];

		if (isStylesheet) {
			// `<link rel="stylesheet">` entries are CSS-only — every sibling
			// chunk in the entrypoint is also CSS. Keep cloning the original
			// `<link>` for them so attributes like `media` carry over.
			for (let i = 0; i < orderedChunks.length - 1; i++) {
				siblings.push(buildSibling(orderedChunks[i], "css"));
			}
		} else {
			// CSS chunks are emitted before JS chunks so the cascade is set
			// up before any script runs. Within CSS the order needs to match
			// the source's import order — `entrypoint.chunks` alone doesn't
			// give us that for arbitrary splitChunks layouts (splitChunks
			// inserts each new chunk before the entry chunk via
			// `insertChunk(_, before)`, so split CSS siblings end up in
			// *reverse* of the order they were processed — exactly the
			// html-webpack-plugin#1838 / mini-css-extract#959 symptom). We
			// re-derive the order from the entrypoint's module post-order
			// index, which mirrors the dependency walk and so reflects the
			// import order.
			/** @type {{ chunk: Chunk, index: number }[]} */
			const cssChunkOrder = [];
			/** @type {Chunk[]} */
			const jsChunks = [];
			/** @type {Chunk[]} */
			const otherChunks = [];
			for (let i = 0; i < orderedChunks.length - 1; i++) {
				const chunk = orderedChunks[i];
				const hasCss = chunkHasCss(chunk, chunkGraph);
				const hasJs = chunkHasJs(chunk, chunkGraph);
				if (hasCss) {
					cssChunkOrder.push({
						chunk,
						index: firstCssModulePostOrderIndex(chunk, entrypoint, chunkGraph)
					});
				}
				if (hasJs) jsChunks.push(chunk);
				if (!hasCss && !hasJs) {
					// Empty chunk (no JS, no CSS — unusual, e.g. wasm-only or
					// asset-only). Fall back to the legacy clone so we at
					// least reference *something*; this preserves prior
					// behavior for users who relied on it.
					otherChunks.push(chunk);
				}
			}
			// If the entry chunk itself contains CSS (entry JS imports CSS
			// without splitChunks separating it), fold it into the same CSS
			// ordering so the entry-chunk `<link>` lands in the correct
			// cascade position relative to sibling CSS chunks.
			if (chunkHasCss(entryChunk, chunkGraph)) {
				cssChunkOrder.push({
					chunk: entryChunk,
					index: firstCssModulePostOrderIndex(
						entryChunk,
						entrypoint,
						chunkGraph
					)
				});
			}
			cssChunkOrder.sort((a, b) => a.index - b.index);
			for (const { chunk } of cssChunkOrder) {
				siblings.push(buildSibling(chunk, "css"));
			}
			for (const chunk of jsChunks) {
				siblings.push(buildSibling(chunk, "javascript"));
			}
			for (const chunk of otherChunks) {
				siblings.push(buildSibling(chunk, "javascript"));
			}
		}

		if (siblings.length > 0) {
			source.insert(dep.tagStart, siblings.join(""));
		}
	}
};

makeSerializable(
	HtmlScriptSrcDependency,
	"webpack/lib/dependencies/HtmlScriptSrcDependency"
);

module.exports = HtmlScriptSrcDependency;
