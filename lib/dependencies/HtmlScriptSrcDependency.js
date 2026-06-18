/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const {
	CSS_IMPORT_TYPE,
	CSS_TYPE,
	JAVASCRIPT_TYPE
} = require("../ModuleSourceTypeConstants");
const HtmlGenerator = require("../html/HtmlGenerator");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {"script" | "script-module" | "modulepreload" | "stylesheet"} HtmlScriptElementKind */

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string, HtmlScriptElementKind, number, number, boolean, string]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string, HtmlScriptElementKind, number, number, boolean, string]>} ObjectSerializerContext */

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
	 * @param {boolean=} tagIsNative whether the originating element is the native tag for `elementKind` (`<script>` / `<link>`); decided at parse time from the tag name so the template needn't re-parse the source text. A custom element mapped to a `script`/`stylesheet` source `type` is non-native and gets a freshly synthesized sibling tag instead of a verbatim clone
	 * @param {string=} copyableAttrsText the originating tag's `nonce`/`crossorigin`/`referrerpolicy` attribute source spans (leading-space-prefixed, in that fixed order), captured at parse time so synthesized sibling `<link>`/`<script>` tags carry the same CSP/fetch policy without the template re-parsing the tag text; empty when none are present
	 */
	constructor(
		request,
		range,
		entryName,
		category,
		elementKind,
		tagStart,
		tagOpenEnd,
		tagIsNative,
		copyableAttrsText
	) {
		super(request);
		this.range = range;
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
		/** @type {HtmlScriptElementKind} */
		this.elementKind = elementKind || "script";
		/** @type {number} */
		this.tagStart = tagStart === undefined ? -1 : tagStart;
		/** @type {number} */
		this.tagOpenEnd = tagOpenEnd === undefined ? -1 : tagOpenEnd;
		/** @type {boolean} */
		this.tagIsNative = tagIsNative !== false;
		/** @type {string} */
		this.copyableAttrsText = copyableAttrsText || "";
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
		context
			.write(this.entryName)
			.write(this._category)
			.write(this.elementKind)
			.write(this.tagStart)
			.write(this.tagOpenEnd)
			.write(this.tagIsNative)
			.write(this.copyableAttrsText);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.entryName = context.read();
		const c1 = context.rest;
		this._category = c1.read();
		const c2 = c1.rest;
		this.elementKind = c2.read();
		const c3 = c2.rest;
		this.tagStart = c3.read();
		const c4 = c3.rest;
		this.tagOpenEnd = c4.read();
		const c5 = c4.rest;
		this.tagIsNative = c5.read();
		const c6 = c5.rest;
		this.copyableAttrsText = c6.read();
		super.deserialize(c6.rest);
	}
}

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
 * Whether webpack will emit a `.js` file for this chunk that must be
 * loaded with a `<script>` tag. Covers three independent reasons a
 * chunk needs JS output: it owns one or more JS-source-type modules;
 * it has entry modules whose source types include JavaScript (entry
 * modules don't show up in `getChunkModulesIterableBySourceType` until
 * they're connected as regular modules — this is why
 * `JavascriptModulesPlugin#_chunkHasJs` checks them separately); or it
 * is a runtime chunk — `chunk.hasRuntime()` — which produces a `.js`
 * file holding the webpack runtime, but its `RuntimeModule`s live in
 * a separate `runtimeModules` set and are *not* surfaced via
 * `getChunkModulesIterableBySourceType`. Missing the runtime case
 * would cause a `runtimeChunk`-split chunk to fall out of the
 * `<script>` list and re-emerge after the chunks that depend on it,
 * producing `__webpack_require__ is not defined` at load time.
 * @param {Chunk} chunk chunk
 * @param {ChunkGraph} chunkGraph chunk graph
 * @returns {boolean} true if the chunk emits a `.js` file
 */
const chunkHasJs = (chunk, chunkGraph) => {
	if (chunk.hasRuntime()) return true;
	if (chunkGraph.getNumberOfEntryModules(chunk) > 0) {
		for (const module of chunkGraph.getChunkEntryModulesIterable(chunk)) {
			if (chunkGraph.getModuleSourceTypes(module).has(JAVASCRIPT_TYPE)) {
				return true;
			}
		}
	}
	return Boolean(
		chunkGraph.getChunkModulesIterableBySourceType(chunk, JAVASCRIPT_TYPE)
	);
};

/**
 * Whether webpack will emit a `.css` file for this chunk that must be
 * loaded with a `<link rel="stylesheet">` tag. Matches
 * `CssModulesPlugin.chunkHasCss` exactly — both regular CSS modules
 * and pure `@import` placeholder modules count, since the latter
 * still contribute a `.css` asset to the chunk.
 * @param {Chunk} chunk chunk
 * @param {ChunkGraph} chunkGraph chunk graph
 * @returns {boolean} true if the chunk emits a `.css` file
 */
const chunkHasCss = (chunk, chunkGraph) =>
	Boolean(chunkGraph.getChunkModulesIterableBySourceType(chunk, CSS_TYPE)) ||
	Boolean(
		chunkGraph.getChunkModulesIterableBySourceType(chunk, CSS_IMPORT_TYPE)
	);

/**
 * Deterministic tie-break key for CSS link ordering. `chunk.name` and
 * `chunk.id` are both stable strings (when present); one of them is set for
 * every chunk webpack emits. We can't rely on `Array.prototype.sort` being
 * stable — webpack still supports Node 10.13 where V8's sort is not guaranteed
 * stable for arrays larger than ten elements — so any time
 * `firstCssModulePostOrderIndex` returns the same value for two chunks (most
 * commonly when several chunks have no reachable CSS module in the entrypoint's
 * dependency walk and all map to `Infinity`) this key picks the canonical order.
 * Computed once per chunk when building the sort array rather than per
 * comparison.
 * @param {Chunk} chunk chunk
 * @returns {string} the tie-break key
 */
const cssChunkSortKey = (chunk) =>
	`${chunk.name || ""} ${chunk.id === null || chunk.id === undefined ? "" : chunk.id}`;

const CSS_SOURCE_TYPES = [CSS_TYPE, CSS_IMPORT_TYPE];

/**
 * Smallest post-order index among the CSS modules of a chunk, taken
 * from the entrypoint's view of the dependency graph. Used to sort
 * sibling CSS chunks so they appear in source import order in the
 * extracted HTML — `entrypoint.chunks` itself does not give that
 * ordering for arbitrary splitChunks layouts. Considers both
 * `CSS_TYPE` and `CSS_IMPORT_TYPE` modules so a chunk made up
 * exclusively of `@import` placeholder modules (e.g. when splitChunks
 * separates them from their target CSS) still sorts by its true
 * source position rather than collapsing to `Infinity` and relying on
 * the chunk-name tie-breaker.
 * @param {Chunk} chunk chunk
 * @param {Entrypoint} entrypoint entrypoint the chunk belongs to
 * @param {ChunkGraph} chunkGraph chunk graph
 * @returns {number} the lowest post-order index of any CSS or
 * CSS-import module in the chunk, or `Number.POSITIVE_INFINITY` when
 * no such module has a defined index (e.g. for a module the
 * entrypoint never reached on its own dependency walk — runtime-only
 * modules, modules reached via `dependOn`, etc.) so such chunks sort
 * last among CSS chunks
 */
const firstCssModulePostOrderIndex = (chunk, entrypoint, chunkGraph) => {
	let min = Number.POSITIVE_INFINITY;
	for (const sourceType of CSS_SOURCE_TYPES) {
		const modules = chunkGraph.getChunkModulesIterableBySourceType(
			chunk,
			sourceType
		);
		if (!modules) continue;
		for (const module of modules) {
			const idx = entrypoint.getModulePostOrderIndex(module);
			if (idx !== undefined && idx < min) min = idx;
		}
	}
	return min;
};

/**
 * Build a fresh `<link rel="stylesheet" href="…">` for a CSS chunk that
 * was pulled in by a `<script src>` entry — the originating tag was a
 * `<script>`, but the chunk is CSS so cloning the script tag verbatim
 * would produce nonsense (`<script src="…\.css">`). `extra` carries the
 * `nonce`/`crossorigin`/`referrerpolicy` source spans captured from the
 * original element at parse time so the same CSP and fetch policy applies;
 * `defer`/`async`/`type` have no meaning on `<link>` and are dropped.
 * @param {string} extra the copyable CSP/fetch attribute source text (leading-space-prefixed, or empty)
 * @param {string} href URL for the stylesheet
 * @returns {string} the sibling `<link>` tag's HTML
 */
const buildStylesheetLink = (extra, href) => {
	const safeHref = href.replace(/"/g, "&quot;");
	return `<link rel="stylesheet" href="${safeHref}"${extra}>`;
};

/**
 * Build a fresh `<script src="…">` for a JS chunk pulled in by a custom
 * (non-`<script>`) element that the user mapped to `type: "script"` /
 * `"script-module"`. Cloning the custom element verbatim and appending
 * `</script>` (as `cloneTagWithUrl` does for a real `<script>`) would emit
 * mismatched, non-executing markup such as `<my-script src="…"></script>`,
 * so synthesize a real script element instead — copying only the CSP/fetch
 * attributes (`extra`, captured at parse time), since the custom element's
 * other attributes have no defined meaning on a `<script>`.
 * @param {string} extra the copyable CSP/fetch attribute source text (leading-space-prefixed, or empty)
 * @param {string} src URL for the script
 * @param {boolean} isModule whether to emit `type="module"`
 * @returns {string} the sibling `<script>` tag's HTML
 */
const buildScriptTag = (extra, src, isModule) => {
	const safeSrc = src.replace(/"/g, "&quot;");
	return `<script${isModule ? ' type="module"' : ""} src="${safeSrc}"${extra}></script>`;
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
	// just `integrity`, which is content-specific and would be wrong for a
	// different chunk's file. The match handles all three quoting styles
	// (`"…"`, `'…'`, unquoted) and the bare-attribute form. The `includes`
	// gate skips the regex engine for the common no-SRI tag.
	// TODO: emit a correct per-chunk `integrity` once a core SRI output
	// option exists, instead of dropping it.
	if (body.includes("integrity")) {
		body = body.replace(
			/\s+integrity(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=[\s/>])/gi,
			""
		);
	}

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

		// Rewrite src/href to a chunk-URL sentinel (resolved by renderManifest):
		// `.css` for `<link rel="stylesheet">`, `.js` for everything else.
		const entryContentHashType = isStylesheet ? "css" : "javascript";
		const entryUrl = HtmlGenerator.makeChunkUrlSentinel(
			entryChunk,
			entryContentHashType
		);
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
		// Non-native originating elements (a custom element mapped to a
		// `script`/`stylesheet` source `type`) can't be cloned verbatim — the
		// clone would be invalid markup (e.g. `<my-script …></script>`), so a
		// real native tag is synthesized instead. Decided at parse time from the
		// tag name (`dep.tagIsNative`) rather than re-parsing the source text.
		const tagIsNative = dep.tagIsNative;

		/**
		 * @param {Chunk} chunk chunk to emit a sibling tag for
		 * @param {"javascript" | "css"} kind content type slice of the chunk to emit
		 * @returns {string} a single sibling tag's HTML
		 */
		const buildSibling = (chunk, kind) => {
			const url = HtmlGenerator.makeChunkUrlSentinel(chunk, kind);
			if (kind === "css") {
				// A CSS chunk is always loaded via `<link rel="stylesheet">`.
				// Clone only when the entry tag is itself a native `<link
				// rel="stylesheet">` (so attributes like `media` carry over);
				// a `<script>` entry that imported CSS, or a custom element,
				// gets a freshly synthesized `<link>`.
				if (isStylesheet && tagIsNative) {
					return cloneTagWithUrl(
						originalTag,
						srcStartInTag,
						srcEndInTag,
						url,
						dep.elementKind
					);
				}
				return buildStylesheetLink(dep.copyableAttrsText, url);
			}
			// A JS chunk is loaded via `<script>`. Clone a native `<script>`
			// verbatim; synthesize a real `<script>` for custom elements that
			// were mapped to `type: script`/`script-module`.
			if (tagIsNative) {
				return cloneTagWithUrl(
					originalTag,
					srcStartInTag,
					srcEndInTag,
					url,
					dep.elementKind
				);
			}
			return buildScriptTag(
				dep.copyableAttrsText,
				url,
				dep.elementKind === "script-module"
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
			/** @type {{ chunk: Chunk, index: number, key: string }[]} */
			const cssChunkOrder = [];
			/** @type {Chunk[]} */
			const jsChunks = [];
			for (let i = 0; i < orderedChunks.length - 1; i++) {
				const chunk = orderedChunks[i];
				const hasCss = chunkHasCss(chunk, chunkGraph);
				const hasJs = chunkHasJs(chunk, chunkGraph);
				if (hasCss) {
					cssChunkOrder.push({
						chunk,
						index: firstCssModulePostOrderIndex(chunk, entrypoint, chunkGraph),
						key: cssChunkSortKey(chunk)
					});
				}
				// Anything that isn't CSS-only stays on the JS lane, in the
				// `orderedChunks` order — that preserves the runtime-first /
				// vendor-before-entry invariant of `getEntrypointChunksInLoadOrder`.
				// Chunks that produce no `.js` and no `.css` (e.g. wasm-only
				// or asset-only) still get a `<script>` clone here so we
				// keep prior behavior for users who relied on it.
				if (hasJs || !hasCss) jsChunks.push(chunk);
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
					),
					key: cssChunkSortKey(entryChunk)
				});
			}
			cssChunkOrder.sort((a, b) => {
				// Direct subtraction would yield `NaN` when both indices are
				// `Infinity` (the documented fallback for chunks whose CSS
				// modules the entrypoint's walk never reaches), and
				// `Array#sort` doesn't promise stable ordering on the legacy
				// Node 10 targets this repo still supports — so the
				// tie-breaker must always run when the indices match,
				// including the `Infinity === Infinity` case.
				if (a.index < b.index) return -1;
				if (a.index > b.index) return 1;
				if (a.key < b.key) return -1;
				if (a.key > b.key) return 1;
				return 0;
			});
			for (const { chunk } of cssChunkOrder) {
				siblings.push(buildSibling(chunk, "css"));
			}
			for (const chunk of jsChunks) {
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
