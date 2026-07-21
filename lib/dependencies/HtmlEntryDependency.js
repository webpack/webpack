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
const ResourceHintPlugin = require("../prefetch/ResourceHintPlugin");
const ResourceHintRuntimeModule = require("../prefetch/ResourceHintRuntimeModule");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {"script" | "script-module" | "modulepreload" | "stylesheet" | "html" | "preload" | "prefetch"} HtmlEntryElementKind */

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, string, HtmlEntryElementKind, number, number, boolean, string, number, boolean, number, (Range | null), (Range | null), boolean, number, number]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[string, string, HtmlEntryElementKind, number, number, boolean, string, number, boolean, number, (Range | null), (Range | null), boolean, number, number]>} ObjectSerializerContext */

class HtmlEntryDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlEntryDependency.
	 * @param {string} request request
	 * @param {Range} range range of the attribute value in the source
	 * @param {string} entryName name of the entry this script src is bundled into
	 * @param {string=} category dependency category used for resolving and grouping
	 * @param {HtmlEntryElementKind=} elementKind shape of the originating HTML element; used when expanding sibling tags for split/runtime chunks
	 * @param {number=} tagStart position of the opening `<` of the originating tag in the source; sibling tags emitted for additional entry chunks are inserted right before this
	 * @param {number=} tagOpenEnd position of the character immediately after the opening tag's `>` in the source; combined with `tagStart` this lets the template clone the original opening tag verbatim (preserving attributes like `nonce`, `crossorigin`, `referrerpolicy`, `defer`, `async`) when generating sibling tags
	 * @param {boolean=} tagIsNative whether the originating element is the native tag for `elementKind` (`<script>` / `<link>`); decided at parse time from the tag name so the template needn't re-parse the source text. A custom element mapped to a `script`/`stylesheet` source `type` is non-native and gets a freshly synthesized sibling tag instead of a verbatim clone
	 * @param {string=} copyableAttrsText the originating tag's `nonce`/`crossorigin`/`referrerpolicy` attribute source spans (leading-space-prefixed, in that fixed order), captured at parse time so synthesized sibling `<link>`/`<script>` tags carry the same CSP/fetch policy without the template re-parsing the tag text; empty when none are present
	 * @param {number=} tagNameEnd position right after the originating tag's name (e.g. after `<script`), captured at parse time so the template can insert a `crossorigin` attribute without re-scanning the tag text for the name boundary
	 * @param {boolean=} hasOwnCrossOrigin whether the originating tag already carries a `crossorigin` attribute; when true the author's value wins and `output.crossOriginLoading` is not applied
	 * @param {number=} cssAnchor source offset of the first classic blocking `<script>` tag (not `defer`/`async`/module — those execute after parsing and after pending stylesheets); injected stylesheet `<link>`s are kept ahead of it. -1 when the document has no blocking script, letting CSS follow `defer`/module script tags (the order Vite emits)
	 * @param {Range | null=} integrityRange source span of the originating tag's `integrity` attribute (offsets relative to `tagStart`, leading whitespace and quotes included), captured at parse time so cloned sibling tags can drop it without re-parsing; null when absent
	 * @param {Range | null=} typeValueRange source span of the originating tag's `type` attribute value (offsets relative to `tagStart`), captured at parse time so `script-module` sibling clones can force `type="module"` in place; null when there is no value to rewrite (a `type="module"` is then inserted instead)
	 * @param {boolean=} forceInline `<!-- webpackInline: true -->` was set before this tag; takes precedence over `output.html.inline`
	 * @param {number=} headOpenEnd position just inside the (possibly implicit) `<head>` — after its opening tag, else after `<html>` or the doctype — captured from the parse so the template needn't re-scan the source (a text scan would match markup inside comments); resource hints are inserted here. -1 when unknown
	 * @param {number=} headAnchor position right after the last node inside `<head>` (the same anchor `output.html` title/meta injection uses); `inject: "head"` sibling tags are inserted here. -1 when the document has no usable head (insertion then falls back to the entry tag)
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
		copyableAttrsText,
		tagNameEnd,
		hasOwnCrossOrigin,
		cssAnchor,
		integrityRange,
		typeValueRange,
		forceInline,
		headOpenEnd,
		headAnchor
	) {
		super(request);
		this.range = range;
		/** @type {string} */
		this.entryName = entryName;
		/** @type {string} */
		this._category = category || "commonjs";
		/** @type {HtmlEntryElementKind} */
		this.elementKind = elementKind || "script";
		/** @type {number} */
		this.tagStart = tagStart === undefined ? -1 : tagStart;
		/** @type {number} */
		this.tagOpenEnd = tagOpenEnd === undefined ? -1 : tagOpenEnd;
		/** @type {boolean} */
		this.tagIsNative = tagIsNative !== false;
		/** @type {string} */
		this.copyableAttrsText = copyableAttrsText || "";
		/** @type {number} */
		this.tagNameEnd = tagNameEnd === undefined ? -1 : tagNameEnd;
		/** @type {boolean} */
		this.hasOwnCrossOrigin = hasOwnCrossOrigin === true;
		/** @type {number} */
		this.cssAnchor = cssAnchor === undefined ? -1 : cssAnchor;
		/** @type {Range | null} */
		this.integrityRange = integrityRange || null;
		/** @type {Range | null} */
		this.typeValueRange = typeValueRange || null;
		/** @type {boolean} */
		this.forceInline = forceInline === true;
		/** @type {number} */
		this.headOpenEnd = headOpenEnd === undefined ? -1 : headOpenEnd;
		/** @type {number} */
		this.headAnchor = headAnchor === undefined ? -1 : headAnchor;
	}

	get type() {
		return "html entry";
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
			.write(this.copyableAttrsText)
			.write(this.tagNameEnd)
			.write(this.hasOwnCrossOrigin)
			.write(this.cssAnchor)
			.write(this.integrityRange)
			.write(this.typeValueRange)
			.write(this.forceInline)
			.write(this.headOpenEnd)
			.write(this.headAnchor);
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
		const c7 = c6.rest;
		this.tagNameEnd = c7.read();
		const c8 = c7.rest;
		this.hasOwnCrossOrigin = c8.read();
		const c9 = c8.rest;
		this.cssAnchor = c9.read();
		const c10 = c9.rest;
		this.integrityRange = c10.read();
		const c11 = c10.rest;
		this.typeValueRange = c11.read();
		const c12 = c11.rest;
		this.forceInline = c12.read();
		const c13 = c12.rest;
		this.headOpenEnd = c13.read();
		const c14 = c13.rest;
		this.headAnchor = c14.read();
		super.deserialize(c14.rest);
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
	`${chunk.name || ""} ${
		chunk.id === null || chunk.id === undefined ? "" : chunk.id
	}`;

/**
 * Sort comparator for the CSS sibling emission order. Direct subtraction
 * would yield `NaN` when both indices are `Infinity` (the documented
 * fallback for chunks whose CSS modules the entrypoint's walk never
 * reaches), and `Array#sort` doesn't promise stable ordering on the legacy
 * Node 10 targets this repo still supports — so the tie-breaker must always
 * run when the indices match, including the `Infinity === Infinity` case.
 * @param {{ index: number, key: string }} a first entry
 * @param {{ index: number, key: string }} b second entry
 * @returns {-1 | 0 | 1} sort order
 */
const compareCssChunkOrder = (a, b) => {
	if (a.index < b.index) return -1;
	if (a.index > b.index) return 1;
	if (a.key < b.key) return -1;
	if (a.key > b.key) return 1;
	return 0;
};

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
 * @param {string} crossOrigin ` crossorigin="…"` to append from `output.crossOriginLoading`, or `""`
 * @param {string} integrity ` integrity="<sentinel>"` to append when `output.html.integrity` is on, or `""`
 * @returns {string} the sibling `<link>` tag's HTML
 */
const buildStylesheetLink = (extra, href, crossOrigin, integrity) => {
	const safeHref = href.replace(/"/g, "&quot;");
	return `<link rel="stylesheet" href="${safeHref}"${extra}${crossOrigin}${integrity}>`;
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
 * @param {string} crossOrigin ` crossorigin="…"` to append from `output.crossOriginLoading`, or `""`
 * @param {string} integrity ` integrity="<sentinel>"` to append when `output.html.integrity` is on, or `""`
 * @returns {string} the sibling `<script>` tag's HTML
 */
const buildScriptTag = (extra, src, isModule, crossOrigin, integrity) => {
	const safeSrc = src.replace(/"/g, "&quot;");
	return `<script${isModule ? ' type="module"' : ""} src="${safeSrc}"${extra}${crossOrigin}${integrity}></script>`;
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
 * the source originally said. The `integrity`/`type` spans come from the
 * parser (`HtmlParser` captured them off the AST); edits are applied
 * right-to-left so earlier offsets stay valid — no re-parsing of the tag.
 * @param {string} originalTag the opening tag's source text including `>`
 * @param {number} srcStartInTag offset of the src/href value start within `originalTag`
 * @param {number} srcEndInTag offset of the src/href value end within `originalTag`
 * @param {string} newUrl URL to put into the cloned tag's src/href slot
 * @param {HtmlEntryElementKind} elementKind shape of the originating tag
 * @param {string} crossOrigin ` crossorigin="…"` to insert from `output.crossOriginLoading`, or `""`
 * @param {number} tagNameEndInTag offset right after the tag name within `originalTag`, where `crossOrigin`/`integrity` are inserted
 * @param {Range | null} integrityRange `integrity` attribute span within `originalTag` to drop, or null
 * @param {Range | null} typeValueRange `type` value span within `originalTag` to overwrite with `module`, or null to insert `type="module"`
 * @param {string} integrity ` integrity="<sentinel>"` to insert when `output.html.integrity` is on, or `""`
 * @returns {string} the sibling tag's HTML (including a closing `</script>` for script tags)
 */
const cloneTagWithUrl = (
	originalTag,
	srcStartInTag,
	srcEndInTag,
	newUrl,
	elementKind,
	crossOrigin,
	tagNameEndInTag,
	integrityRange,
	typeValueRange,
	integrity
) => {
	const isLink =
		elementKind === "modulepreload" || elementKind === "stylesheet";

	/** @type {{ start: number, end: number, text: string }[]} */
	const edits = [{ start: srcStartInTag, end: srcEndInTag, text: newUrl }];

	// Drop the author's `integrity` — content-specific, wrong for another
	// chunk's file. A correct per-chunk one is re-inserted below from
	// `output.html.integrity`.
	if (integrityRange) {
		edits.push({ start: integrityRange[0], end: integrityRange[1], text: "" });
	}

	// Inserted right after the tag name: `crossorigin` from
	// `output.crossOriginLoading`, then a forced `type="module"` when the tag
	// has no `type` value to rewrite in place.
	let afterName = crossOrigin;
	if (elementKind === "script-module") {
		if (typeValueRange) {
			edits.push({
				start: typeValueRange[0],
				end: typeValueRange[1],
				text: "module"
			});
		} else {
			afterName += ' type="module"';
		}
	}

	// Per-chunk `integrity` sentinel goes in alongside `crossorigin`/`type`.
	afterName += integrity;
	if (afterName) {
		edits.push({
			start: tagNameEndInTag,
			end: tagNameEndInTag,
			text: afterName
		});
	}

	edits.sort((a, b) => b.start - a.start);
	let body = originalTag;
	for (const edit of edits) {
		body = body.slice(0, edit.start) + edit.text + body.slice(edit.end);
	}

	// `<link>` is a void element — no closing tag. `<script>` needs `</script>`.
	return isLink ? body : `${body}</script>`;
};

// ES5 `<link rel="modulepreload">` polyfill (Safari <17, Firefox <115, …):
// on browsers without native support, fetch each modulepreload target with the
// tag's own credentials/integrity so the pending module import reuses it. The
// `.ep` guard makes it idempotent, and the observer catches any later-inserted
// links. Emitted only when the target environment lacks native support.
const MODULEPRELOAD_POLYFILL = [
	"(function(){",
	'var s=document.createElement("link").relList;',
	'if(s&&s.supports&&s.supports("modulepreload"))return;',
	"function f(e){",
	"if(e.ep)return;e.ep=1;",
	"var o={};",
	"if(e.integrity)o.integrity=e.integrity;",
	"if(e.referrerPolicy)o.referrerPolicy=e.referrerPolicy;",
	'o.credentials=e.crossOrigin==="use-credentials"?"include":e.crossOrigin==="anonymous"?"omit":"same-origin";',
	"fetch(e.href,o)}",
	"var l=document.querySelectorAll('link[rel=\"modulepreload\"]');",
	"for(var i=0;i<l.length;i++)f(l[i]);",
	"new MutationObserver(function(m){",
	"for(var j=0;j<m.length;j++)",
	"for(var a=m[j].addedNodes,k=0;k<a.length;k++)",
	'if(a[k].tagName==="LINK"&&a[k].rel==="modulepreload")f(a[k])',
	"}).observe(document,{childList:true,subtree:true})",
	"})();"
].join("");

// One polyfill `<script>` per rendered page. Keyed by the `ReplaceSource` of a
// single HTML code-generation pass (shared by all of a page's entry tags, fresh
// per pass), so multi-`<script>` pages get exactly one and the cache stays correct.
/** @type {WeakSet<ReplaceSource>} */
const polyfilledSources = new WeakSet();

/** @typedef {"preload" | "prefetch" | "modulepreload" | "preconnect" | "dns-prefetch"} HtmlResourceHintRel */
/**
 * A custom resource-hint `<link>` (`output.html.resourceHints`). Exactly one of
 * `href` / `chunk` / `entry` names the target; `chunk`/`entry` URLs (hash and
 * public path) are resolved by webpack, `href` is used verbatim.
 * @typedef {object} HtmlResourceHint
 * @property {HtmlResourceHintRel} rel hint relationship
 * @property {string=} href literal URL (external, `preconnect`, or an already-hashed asset)
 * @property {string=} chunk chunk name to hint
 * @property {string=} entry entrypoint name to hint (expands to one hint per initial chunk)
 * @property {string=} as the `as` attribute; defaults to `script` for chunk/entry refs
 * @property {string=} type the `type` attribute (MIME)
 * @property {(boolean | "anonymous" | "use-credentials")=} crossorigin CORS mode (`true` → `anonymous`)
 * @property {string=} media the `media` attribute
 * @property {boolean=} integrity SRI for a chunk/entry ref; follows `output.html.integrity` by default, `false` opts out
 * @property {("low" | "high" | "auto")=} fetchPriority the `fetchpriority` attribute (allowed on `preload`/`modulepreload`/`prefetch`)
 */
/**
 * @typedef {object} HtmlResourceHintContext
 * @property {string} entryName name of the entry this page loads
 * @property {Entrypoint} entrypoint the entrypoint
 * @property {"html" | "js"} hostType `"html"` when the entry has an extracted HTML page; `"js"` when a JS-only entry is being consulted (SSR framework case)
 * @property {import("../Compilation")} compilation the compilation
 * @property {{ rel: "modulepreload" | "preload" | "prefetch", chunk: string, hostChunks: string[] }[]} defaultHints the auto initial-graph hints (`chunk` / `hostChunks` name the referencing chunk — Vite's `hostId`)
 */

/**
 * @param {string} value attribute value
 * @returns {string} value with `"` escaped so it can't break out of the attribute
 */
const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

/**
 * @param {boolean | "anonymous" | "use-credentials" | undefined} value crossorigin option
 * @returns {string | undefined} ` crossorigin="…"`, or undefined when unset/false
 */
const crossOriginAttr = (value) => {
	if (value === undefined || value === false) return undefined;
	return ` crossorigin="${value === true ? "anonymous" : value}"`;
};

/**
 * Build one resource-hint `<link>` tag from a resolved href and attributes.
 * @param {HtmlResourceHintRel} rel the `rel`
 * @param {{ href: string, as?: string, type?: string, crossorigin?: string, integrity?: string, media?: string, fetchpriority?: string }} attrs attributes (already href-resolved; `crossorigin`/`integrity` are full ` name="…"` spans)
 * @returns {string} the `<link>` tag
 */
const buildLinkTag = (rel, attrs) =>
	`<link rel="${rel}"${attrs.as ? ` as="${escapeAttr(attrs.as)}"` : ""}${
		attrs.type ? ` type="${escapeAttr(attrs.type)}"` : ""
	} href="${escapeAttr(attrs.href)}"${attrs.crossorigin || ""}${
		attrs.integrity || ""
	}${attrs.media ? ` media="${escapeAttr(attrs.media)}"` : ""}${
		attrs.fetchpriority
			? ` fetchpriority="${escapeAttr(attrs.fetchpriority)}"`
			: ""
	}>`;

/**
 * Resolve one `output.html.resourceHints` descriptor to zero or more `<link>`
 * tags. A `chunk`/`entry` reference becomes the emitted chunk URL (a sentinel
 * resolved with the final hash and public path), an `href` is used verbatim, and
 * `preconnect`/`dns-prefetch` use only `href`. Unknown chunk/entry names are skipped.
 * @param {HtmlResourceHint} desc the descriptor
 * @param {{ compilation: import("../Compilation"), chunkGraph: ChunkGraph, chunkByName: Map<string, Chunk>, outputCrossOrigin: string, integrityOn: boolean }} ctx resolution context
 * @returns {string[]} the resolved tags
 */
const resolveResourceHint = (desc, ctx) => {
	const rel = desc.rel;
	if (rel === "preconnect" || rel === "dns-prefetch") {
		if (!desc.href) return [];
		return [
			buildLinkTag(rel, {
				href: desc.href,
				crossorigin: crossOriginAttr(desc.crossorigin),
				media: desc.media
			})
		];
	}
	if (desc.href) {
		return [
			buildLinkTag(rel, {
				href: desc.href,
				as: desc.as,
				type: desc.type,
				crossorigin: crossOriginAttr(desc.crossorigin),
				media: desc.media,
				fetchpriority: desc.fetchPriority
			})
		];
	}
	/** @type {Chunk[]} */
	let chunks;
	if (desc.entry) {
		const entrypoint = ctx.compilation.entrypoints.get(desc.entry);
		if (!entrypoint) return [];
		chunks = getEntrypointChunksInLoadOrder(entrypoint);
	} else if (desc.chunk) {
		const chunk = ctx.chunkByName.get(desc.chunk);
		if (!chunk) return [];
		chunks = [chunk];
	} else {
		return [];
	}
	const kind = desc.as === "style" ? "css" : "javascript";
	const as = desc.as || (rel === "modulepreload" ? undefined : "script");
	// A hint targeting another chunk must match how that chunk is fetched, so
	// inherit `output.crossOriginLoading` unless the descriptor overrides it.
	const crossorigin =
		desc.crossorigin !== undefined
			? crossOriginAttr(desc.crossorigin)
			: ctx.outputCrossOrigin || undefined;
	/** @type {string[]} */
	const tags = [];
	for (const chunk of chunks) {
		const has =
			kind === "css"
				? chunkHasCss(chunk, ctx.chunkGraph)
				: chunkHasJs(chunk, ctx.chunkGraph);
		if (!has) continue;
		tags.push(
			buildLinkTag(rel, {
				href: HtmlGenerator.makeChunkUrlSentinel(chunk, kind),
				as,
				type: desc.type,
				crossorigin,
				// SRI follows the global `output.html.integrity` policy (like the
				// auto hints); `integrity: false` opts a single hint out. Only
				// `preload`/`modulepreload` are SRI-eligible — `prefetch` is not.
				integrity:
					(rel === "preload" || rel === "modulepreload") &&
					desc.integrity !== false &&
					ctx.integrityOn
						? ` integrity="${HtmlGenerator.makeChunkIntegritySentinel(chunk, kind)}"`
						: undefined,
				media: desc.media,
				fetchpriority: desc.fetchPriority
			})
		);
	}
	return tags;
};

HtmlEntryDependency.Template = class HtmlEntryDependencyTemplate extends (
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
		const dep = /** @type {HtmlEntryDependency} */ (dependency);
		const compilation = runtimeTemplate.compilation;

		// A `type: "html"` link points at another emitted page, not a JS/CSS
		// chunk: rewrite the attribute to that page's filename (resolved by
		// HtmlModulesPlugin once it's built) and emit no sibling tags — a page
		// link loads only itself.
		if (dep.elementKind === "html") {
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				HtmlGenerator.makeHtmlPageUrlSentinel(dep.entryName)
			);
			return;
		}

		const { chunkGraph } = compilation;
		const { crossOriginLoading } = compilation.outputOptions;
		const entrypoint = /** @type {Entrypoint | undefined} */ (
			compilation.entrypoints.get(dep.entryName)
		);

		if (!entrypoint) {
			source.replace(dep.range[0], dep.range[1] - 1, "data:,");
			return;
		}

		const orderedChunks = getEntrypointChunksInLoadOrder(entrypoint);
		const entryChunk = orderedChunks[orderedChunks.length - 1];

		// `crossorigin` mirrors `output.crossOriginLoading` onto every injected
		// tag. Empty when the option is off or the originating tag already set
		// `crossorigin` (author value wins, flagged at parse time). Mirrors
		// webpack's runtime, which sets `crossOrigin` on chunk-loading scripts,
		// and matches Vite, which emits it on every injected script/stylesheet.
		const crossOrigin =
			crossOriginLoading && !dep.hasOwnCrossOrigin
				? ` crossorigin="${crossOriginLoading}"`
				: "";

		// Per-chunk SRI: emit an `integrity` sentinel resolved late (after the
		// chunks' final bytes exist) by `resolveChunkIntegritySentinels`. On when
		// `output.html.integrity` is `true`, a non-empty array, or a function.
		const htmlOption = compilation.outputOptions.html;
		const integrity =
			typeof htmlOption === "object" ? htmlOption.integrity : undefined;
		const integrityOn =
			integrity === true ||
			typeof integrity === "function" ||
			(Array.isArray(integrity) && integrity.length > 0);
		const inject =
			typeof htmlOption === "object" ? htmlOption.inject : undefined;

		/**
		 * Mirror `crossorigin`/`integrity` onto a native entry tag, inserted right
		 * after the tag name so they sit alongside any `type="module"` the parser
		 * injected. The author's content-specific `integrity` is dropped first (as
		 * clones do) so the tag never carries two.
		 * @param {Chunk} chunk chunk whose SRI hash the tag references
		 * @param {"javascript" | "css"} contentHashType which chunk asset to hash
		 * @returns {void}
		 */
		const applyEntryTagAttrs = (chunk, contentHashType) => {
			if (!dep.tagIsNative || dep.tagNameEnd < 0) return;
			if (crossOrigin) source.insert(dep.tagNameEnd, crossOrigin);
			if (integrityOn) {
				if (dep.integrityRange) {
					source.replace(
						dep.tagStart + dep.integrityRange[0],
						dep.tagStart + dep.integrityRange[1] - 1,
						""
					);
				}
				source.insert(
					dep.tagNameEnd,
					` integrity="${HtmlGenerator.makeChunkIntegritySentinel(
						chunk,
						contentHashType
					)}"`
				);
			}
		};

		// `rel="preload"/"prefetch"` is a resource hint: rewrite the `href` to the
		// built chunk's URL (CSS for `as="style"`, JS otherwise) and stop — no
		// sibling tags and no execution.
		if (dep.elementKind === "preload" || dep.elementKind === "prefetch") {
			const contentHashType =
				dep.category === "css-import" ? "css" : "javascript";
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				HtmlGenerator.makeChunkUrlSentinel(entryChunk, contentHashType)
			);
			// `preload` is integrity-eligible per the SRI spec, so mirror
			// `crossorigin`/`integrity` onto it (SRI requires CORS). `prefetch` is a
			// navigation cache hint the spec doesn't cover — leave it a bare href.
			if (dep.elementKind === "preload") {
				applyEntryTagAttrs(entryChunk, contentHashType);
			}
			return;
		}

		const isStylesheet = dep.elementKind === "stylesheet";
		// Inlined scripts are `type="module"` only for ESM output; classic-IIFE
		// chunks (the default) must stay a plain `<script>`.
		const scriptTypeAttr =
			compilation.outputOptions.module === true ? ' type="module"' : "";

		const entryContentHashType = isStylesheet ? "css" : "javascript";
		const inlineOption =
			typeof htmlOption === "object" ? htmlOption.inline : undefined;
		/** @type {RegExp[] | null} */
		const inlinePatterns = Array.isArray(inlineOption) ? inlineOption : null;
		/**
		 * @param {Chunk} chunk chunk to test
		 * @param {"javascript" | "css"} contentType which asset of the chunk is being emitted
		 * @returns {boolean} true when this chunk's content should be inlined
		 */
		const isChunkInlined = (chunk, contentType) => {
			// A `<link rel="modulepreload">` is a void fetch hint — inlining it would
			// emit an unclosed, executing `<script>`.
			if (dep.elementKind === "modulepreload") return false;
			if (dep.forceInline) return true;
			if (!inlineOption) return false;
			if (inlineOption === true) return true;
			// `"script"`/`"style"` inline by asset type, not chunk name — a chunk's
			// JS and CSS share a name, so only the emitted `contentType` tells them
			// apart.
			if (inlineOption === "script") return contentType === "javascript";
			if (inlineOption === "style") return contentType === "css";
			const name = chunk.name || String(chunk.id);
			return /** @type {RegExp[]} */ (inlinePatterns).some((re) =>
				re.test(name)
			);
		};

		// Only inline when the HTML module is emitted as a standalone page (extract mode).
		// If it's exported as a JS string, sentinels would end up embedded in the JS chunk.
		const isExtractedHtml = chunkGraph
			.getModuleSourceTypes(
				/** @type {import("../Module")} */ (templateContext.module)
			)
			.has("html");
		const entryInlined =
			isExtractedHtml &&
			dep.tagStart >= 0 &&
			dep.tagOpenEnd > dep.tagStart &&
			isChunkInlined(entryChunk, entryContentHashType);

		if (entryInlined) {
			const inlineSentinel = HtmlGenerator.makeChunkInlineSentinel(
				entryChunk,
				entryContentHashType
			);
			if (isStylesheet) {
				source.replace(
					dep.tagStart,
					dep.tagOpenEnd - 1,
					`<style>${inlineSentinel}</style>`
				);
			} else {
				source.replace(
					dep.tagStart,
					dep.tagOpenEnd - 1,
					`<script${scriptTypeAttr}>${inlineSentinel}`
				);
			}
		} else {
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				HtmlGenerator.makeChunkUrlSentinel(entryChunk, entryContentHashType)
			);
		}

		if (dep.tagStart < 0 || dep.tagOpenEnd <= dep.tagStart) {
			return;
		}

		const originalContent = /** @type {string} */ (source.original().source());
		const originalTag = originalContent.slice(dep.tagStart, dep.tagOpenEnd);
		const srcStartInTag = dep.range[0] - dep.tagStart;
		const srcEndInTag = dep.range[1] - dep.tagStart;
		const tagIsNative = dep.tagIsNative;
		const tagNameEndInTag = dep.tagNameEnd - dep.tagStart;

		// Mirror `crossorigin`/`integrity` onto the non-inlined entry tag
		// (siblings get them via the builders below).
		if (!entryInlined) applyEntryTagAttrs(entryChunk, entryContentHashType);

		// `inject: false` suppresses sibling-chunk tags only; resource hints
		// below still apply (the way to reference the suppressed chunks).
		if (inject !== false) {
			/**
			 * @param {Chunk} chunk chunk to emit a sibling tag for
			 * @param {"javascript" | "css"} kind content type slice of the chunk to emit
			 * @returns {string} a single sibling tag's HTML
			 */
			const buildSibling = (chunk, kind) => {
				if (isChunkInlined(chunk, kind)) {
					const sentinel = HtmlGenerator.makeChunkInlineSentinel(chunk, kind);
					return kind === "css"
						? `<style>${sentinel}</style>`
						: `<script${scriptTypeAttr}>${sentinel}</script>`;
				}
				const url = HtmlGenerator.makeChunkUrlSentinel(chunk, kind);
				const integrityAttr = integrityOn
					? ` integrity="${HtmlGenerator.makeChunkIntegritySentinel(chunk, kind)}"`
					: "";
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
							dep.elementKind,
							crossOrigin,
							tagNameEndInTag,
							dep.integrityRange,
							dep.typeValueRange,
							integrityAttr
						);
					}
					return buildStylesheetLink(
						dep.copyableAttrsText,
						url,
						crossOrigin,
						integrityAttr
					);
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
						dep.elementKind,
						crossOrigin,
						tagNameEndInTag,
						dep.integrityRange,
						dep.typeValueRange,
						integrityAttr
					);
				}
				return buildScriptTag(
					dep.copyableAttrsText,
					url,
					dep.elementKind === "script-module",
					crossOrigin,
					integrityAttr
				);
			};

			const siblings = [];
			// Parser-derived anchor (a source text scan would match `</head>` inside
			// comments or raw text).
			const headClose = inject === "head" ? dep.headAnchor : -1;
			// When the entry tag is already inside <head> (tagStart < headClose),
			// inserting siblings at headClose would place them after the entry,
			// reversing runtime-before-entry execution order for deferred scripts.
			// Insert before the entry tag instead so the load order is preserved.
			const headAt =
				headClose < 0
					? -1
					: dep.tagStart < headClose
						? dep.tagStart
						: headClose;

			let cssHtml = "";
			let cssAt = -1;
			if (isStylesheet) {
				// `<link rel="stylesheet">` entries are CSS, but a shared/runtime
				// JS-only chunk (e.g. `optimization.runtimeChunk`) can still sit in
				// the entrypoint — only clone the `<link>` for siblings that actually
				// produce a `.css` asset (mirrors the JS branch below), otherwise the
				// link points at a non-existent `.css` file (a 404, or an empty
				// `<style>` when inlined). Attributes like `media` still carry over.
				for (let i = 0; i < orderedChunks.length - 1; i++) {
					if (chunkHasCss(orderedChunks[i], chunkGraph)) {
						siblings.push(buildSibling(orderedChunks[i], "css"));
					}
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
							index: firstCssModulePostOrderIndex(
								chunk,
								entrypoint,
								chunkGraph
							),
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
				cssChunkOrder.sort(compareCssChunkOrder);
				// Stylesheets always land in <head> when the page has one. A
				// classic blocking script pins them ahead of itself (`cssAnchor`)
				// so its execution never awaits later CSS; when every script is
				// `defer`/module they go to the *end* of head, after the script
				// tags — Vite's and html-webpack-plugin's order: the scripts
				// start fetching earlier yet still execute after parsing and
				// after pending stylesheets.
				cssAt =
					dep.headAnchor >= 0
						? dep.cssAnchor >= 0 && dep.cssAnchor < dep.headAnchor
							? dep.cssAnchor
							: dep.headAnchor
						: dep.cssAnchor >= 0
							? dep.cssAnchor
							: dep.tagStart;
				cssHtml = cssChunkOrder
					.map(({ chunk }) => buildSibling(chunk, "css"))
					.join("");
				for (const chunk of jsChunks) {
					siblings.push(buildSibling(chunk, "javascript"));
				}
			}

			// Same-offset inserts keep call order: CSS goes in before the
			// sibling scripts only when a blocking script demands CSS-first.
			if (cssHtml !== "" && dep.cssAnchor >= 0) source.insert(cssAt, cssHtml);
			if (siblings.length > 0) {
				source.insert(headAt >= 0 ? headAt : dep.tagStart, siblings.join(""));
			}
			if (cssHtml !== "" && dep.cssAnchor < 0) source.insert(cssAt, cssHtml);
		}

		// Resource hints are opt-in — webpack already loads the initial chunks
		// via parallel `<script>` tags, so there is no waterfall to prevent by
		// default. `output.resourceHints` requests them: `true` preloads the
		// entry's initial dependency chunks (runtime, vendor, split); an array
		// or function adds custom hints (a function may spread the auto
		// `defaultHints`). Only for extracted pages — a JS-string HTML export
		// would embed the sentinels in the JS chunk. URL-referenced assets
		// (fonts, images) carrying `webpackPrefetch` / `webpackPreload`
		// (magic-comment or `parser.<type>.urlHints` rule) also emit here.
		const resourceHintResolver =
			ResourceHintPlugin.getCompilationResolver(compilation);
		const resourceHints = resourceHintResolver.hints;
		if (
			isExtractedHtml &&
			(dep.elementKind === "script" || dep.elementKind === "script-module")
		) {
			const isModuleOutput = compilation.outputOptions.module === true;

			/** @type {string[]} */
			const hints = [];

			// === preconnect channel — cross-origin publicPath (resourceHints.preconnect) ===
			const rhOptions = compilation.outputOptions.resourceHints;
			if (rhOptions && rhOptions.preconnect) {
				const pp = compilation.outputOptions.publicPath;
				const originMatch =
					typeof pp === "string" ? /^(https?:)?\/\/[^/?#]+/i.exec(pp) : null;
				if (originMatch) {
					hints.push(
						`<link rel="preconnect" href="${escapeAttr(originMatch[0])}"${crossOrigin}>`
					);
				}
			}

			// === chunks channel — the entry's own initial dependency graph ===
			if (resourceHints !== undefined && resourceHints !== false) {
				// The auto initial-graph preload as descriptors carrying their exact
				// tag, built only when needed (`true`/`"prefetch"` emits them, a
				// function may spread them). The entry chunk is skipped — it's
				// already the `<script src>`. ESM uses `modulepreload` (fetch +
				// parse), classic output `preload as="script"`, and `"prefetch"`
				// opts into `<link rel="prefetch">` (idle-time fetch, no `as` / no
				// `integrity` — the spec doesn't list them). Async `import()` chunks
				// aren't covered here; use `module.parser.javascript.dynamicImport*`
				// which routes through webpack's on-demand chunk-load runtime.
				const prefetchMode = resourceHints === "prefetch";
				const preloadMode = resourceHints === true;
				/** @type {"modulepreload" | "preload" | "prefetch"} */
				const rel = prefetchMode
					? "prefetch"
					: isModuleOutput
						? "modulepreload"
						: "preload";
				/** @type {{ rel: "modulepreload" | "preload" | "prefetch", chunk: string, hostChunks: string[], _tag: string }[]} */
				const defaultHints = [];
				if (
					preloadMode ||
					prefetchMode ||
					typeof resourceHints === "function"
				) {
					for (const chunk of orderedChunks) {
						if (
							chunk === entryChunk ||
							isChunkInlined(chunk, "javascript") ||
							!chunkHasJs(chunk, chunkGraph)
						) {
							continue;
						}
						const href = HtmlGenerator.makeChunkUrlSentinel(
							chunk,
							"javascript"
						);
						const integrityAttr =
							integrityOn && !prefetchMode
								? ` integrity="${HtmlGenerator.makeChunkIntegritySentinel(
										chunk,
										"javascript"
									)}"`
								: "";
						// Mirror the entry tag's `nonce`/`crossorigin`/`referrerpolicy`
						// (and `output.crossOriginLoading`) so the request matches the
						// sibling `<script>`'s and the browser reuses it instead of
						// fetching twice.
						const attrs = `${dep.copyableAttrsText}${crossOrigin}${integrityAttr}`;
						const tag = prefetchMode
							? `<link rel="prefetch" href="${href}"${attrs}>`
							: isModuleOutput
								? `<link rel="modulepreload" href="${href}"${attrs}>`
								: `<link rel="preload" as="script" href="${href}"${attrs}>`;
						const chunkName = chunk.name || String(chunk.id);
						defaultHints.push({
							rel,
							chunk: chunkName,
							hostChunks: [chunkName],
							_tag: tag
						});
					}
				}

				if (preloadMode || prefetchMode) {
					for (const d of defaultHints) {
						hints.push(d._tag);
					}
				} else {
					// Array (custom only) or function (returns the final list, may spread
					// `defaultHints`). A returned default hint keeps its prebuilt tag; any
					// other descriptor is resolved through the URL/SRI pipeline.
					let descriptors = resourceHints;
					if (typeof resourceHints === "function") {
						// The page's own entry name (its named entry chunk), not the synthetic
						// `<script>` entry — that's what users key on.
						let entryName = dep.entryName;
						for (const c of chunkGraph.getModuleChunks(
							/** @type {import("../Module")} */ (templateContext.module)
						)) {
							if (c.name) {
								entryName = c.name;
								break;
							}
						}
						descriptors = resourceHints({
							entryName,
							entrypoint,
							hostType: "html",
							compilation,
							defaultHints
						});
					}
					if (Array.isArray(descriptors) && descriptors.length > 0) {
						/** @type {Map<string, Chunk>} */
						const chunkByName = new Map();
						for (const c of compilation.chunks) {
							if (c.name) chunkByName.set(c.name, c);
						}
						const outputCrossOrigin = crossOriginLoading
							? ` crossorigin="${crossOriginLoading}"`
							: "";
						const ctx = {
							compilation,
							chunkGraph,
							chunkByName,
							outputCrossOrigin,
							integrityOn
						};
						for (const desc of descriptors) {
							if (!desc || typeof desc !== "object") continue;
							const prebuilt = /** @type {{ _tag?: string }} */ (desc)._tag;
							if (prebuilt) {
								hints.push(prebuilt);
							} else if (desc.rel) {
								for (const tag of resolveResourceHint(desc, ctx)) {
									hints.push(tag);
								}
							}
						}
					}
				}
			}

			// === assets channel — URL-referenced assets carrying `prefetch`/`preload` ===
			// The plugin has already scanned the entrypoint's chunks × modules
			// once and cached the URL/CSS/HTML asset deps for this entry name;
			// consume that list here so this template doesn't repeat the walk.
			// Each unique asset emits one `<link rel="prefetch|preload">` into
			// the HTML `<head>`; the JS chunk-startup runtime skips it (no
			// double `<link>` in DOM). URLs are sentinels resolved from asset
			// codegen data during `HtmlModulesPlugin` render — the asset
			// module might not have been codegen'd yet at this point.
			const outputCrossOriginAttr = crossOriginLoading
				? ` crossorigin="${crossOriginLoading}"`
				: "";
			for (const { module, dep: md } of resourceHintResolver.getHtmlHinted(
				dep.entryName
			)) {
				const rel = md.preload ? "preload" : "prefetch";
				const asAttr =
					md.asAttribute ||
					ResourceHintRuntimeModule.guessAsAttribute(
						/** @type {import("./URLDependency")} */ (md).request || ""
					);
				const typeAttr = md.typeAttribute;
				const mediaAttr = md.mediaAttribute;
				const fetchPriority = md.fetchPriority;
				const href = HtmlGenerator.makeAssetUrlSentinel(module.identifier());
				const attrs =
					`${asAttr ? ` as="${escapeAttr(asAttr)}"` : ""}` +
					`${typeAttr ? ` type="${escapeAttr(typeAttr)}"` : ""}` +
					` href="${escapeAttr(href)}"${
						outputCrossOriginAttr
					}${mediaAttr ? ` media="${escapeAttr(mediaAttr)}"` : ""}` +
					`${fetchPriority ? ` fetchpriority="${escapeAttr(fetchPriority)}"` : ""}`;
				hints.push(`<link rel="${rel}"${attrs}>`);
			}

			if (hints.length > 0) {
				// De-duplicate (a custom hint may repeat an auto one), preserving order.
				/** @type {Set<string>} */
				const seen = new Set();
				/** @type {string[]} */
				const finalHints = [];
				for (const h of hints) {
					if (!seen.has(h)) {
						seen.add(h);
						finalHints.push(h);
					}
				}
				// When the target environment lacks native `modulepreload` (an
				// `output.environment` capability, like the JS-feature checks), append
				// a tiny polyfill once per page so the hints still warm the cache there.
				// `resourceHints.modulePreloadPolyfill` defaults from the target's
				// modulepreload support (`output.environment.modulePreload`); `false`
				// opts out (strict CSP).
				if (
					rhOptions &&
					rhOptions.modulePreloadPolyfill &&
					!polyfilledSources.has(source) &&
					finalHints.some((h) => h.startsWith('<link rel="modulepreload"'))
				) {
					polyfilledSources.add(source);
					finalHints.push(`<script>${MODULEPRELOAD_POLYFILL}</script>`);
				}
				// Insert right after the `<head>` open tag (parser-derived) so the
				// hints are the document's first fetches; fall back to the first
				// blocking script (else the entry tag) when the page has no
				// written `<head>` (e.g. an HTML fragment).
				const hintAt =
					dep.headOpenEnd >= 0
						? dep.headOpenEnd
						: dep.cssAnchor === -1
							? dep.tagStart
							: dep.cssAnchor;
				source.insert(hintAt, finalHints.join(""));
			}
		}
	}
};

makeSerializable(
	HtmlEntryDependency,
	"webpack/lib/dependencies/HtmlEntryDependency"
);

module.exports = HtmlEntryDependency;
