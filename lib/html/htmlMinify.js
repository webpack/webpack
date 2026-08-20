/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/** @typedef {import("../html/syntax").HtmlPrintOptions} HtmlPrintOptions */
/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */

/**
 * A `minify` function for `minimizer-webpack-plugin` (passed as its `minify`
 * option): safely serializes one HTML asset's minimized form. Every node is
 * rebuilt from its parsed form to the same DOM (text whitespace and attribute
 * values preserved); the transforms are dropping inert comments (conditional /
 * SSI comments are kept) and rewriting opening tags to their shortest equivalent
 * spelling. HTML minification thus reuses that plugin's pipeline — caching and
 * worker-thread parallelization.
 *
 * The parser is read from the public `webpack.html.syntax` API inside the body, not
 * imported at module scope: `minimizer-webpack-plugin` ships this function to its
 * worker pool as source (a top-level import wouldn't survive), and `require("webpack")`
 * re-resolves in the worker — via the installed package, or the dev self-link.
 * @param {{ [file: string]: string }} input a single `{ filename: code }` entry
 * @param {(RawSourceMap | undefined)=} sourceMap input source map (unused: safe serialize keeps positions token-coarse, so no map is produced yet)
 * @param {HtmlPrintOptions & { minifyConditionalComments?: boolean, minifySrcdoc?: boolean }=} minimizerOptions minimizer options — `environment` and `convertLengthUnits` reach the CSS minifier this runs over inline CSS; the rest is `optimization.minimize.html`
 * @returns {{ code: string }} the minified HTML
 */
const htmlMinify = (input, sourceMap, minimizerOptions = {}) => {
	const webpack = /** @type {typeof import("../index")} */ (
		// eslint-disable-next-line import/no-extraneous-dependencies -- webpack self-require, re-resolved inside the worker
		require(/** @type {string} */ ("webpack"))
	);

	// TODO accept a JS minify function here so an inline `<script>` can be
	// minified: terser is async and reaches webpack only via the minimizer
	// plugin, which already holds one.
	// TODO expose the value rewrites as options. `style` / `class` / `srcset` /
	// viewport `content` and boolean-attribute collapsing keep what the DOM
	// parses but change the attribute string a script reads back, so a consumer
	// that compares those bytes wants a way to turn each off. Room to widen them
	// too: any boolean value rather than only the canonical spellings.
	const {
		SourceProcessor,
		NodeType,
		NS_HTML,
		decodeEntities,
		escapeAttribute
	} = webpack.html.syntax;
	const [[, code]] = Object.entries(input);
	// The nested CSS minifier gets the abilities and options a `.css` asset
	// gets, or the inline copy of a declaration would disagree with it.
	const {
		environment,
		convertLengthUnits,
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		preserveComments,
		removeRedundantAttributes,
		minifyConditionalComments,
		minifySrcdoc,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags
	} = minimizerOptions;
	// One set of options, handed to the document pass and to each conditional
	// comment's body below.
	const printOptions = {
		mode: /** @type {"minify"} */ ("minify"),
		environment,
		convertLengthUnits,
		collapseWhitespace,
		mergeStyles,
		removeEmptyAttributes,
		removeEmptyElements,
		preserveComments,
		removeRedundantAttributes,
		sortAttributes,
		sortTokenLists,
		removeImpliedTags
	};
	// Recursion goes through this local name, never the module's own: the plugin
	// ships this function to its workers as source, where that binding is absent.
	/**
	 * @param {string} text a whole document
	 * @returns {string} the same document, minified
	 */
	const minifyDocument = (text) => {
		// Put back into the source, not the output: the printer respells an
		// attribute value, so the recorded text is not what the output holds.
		let source = text;
		// Spelt as an attribute with a value: one written bare carries no document.
		if (minifySrcdoc && /srcdoc\s*=/i.test(source)) {
			/** @type {{ start: number, end: number, value: string }[]} */
			const found = [];
			new SourceProcessor()
				.use({
					[NodeType.Element]: (path) => {
						// An `<iframe>` in foreign content is an SVG or MathML element that
						// happens to share the name, and its `srcdoc` is not this attribute.
						if (path.tagName() !== "iframe" || path.namespace() !== NS_HTML) {
							return;
						}
						for (const attribute of path.attributes()) {
							if (attribute.name !== "srcdoc" || attribute.value === "") {
								continue;
							}
							found.push({
								start: attribute.valueStart,
								end: attribute.valueEnd,
								value: attribute.value
							});
						}
					}
				})
				.process(source, {});
			// Back to front, so an earlier splice does not move a later range.
			for (let i = found.length - 1; i >= 0; i--) {
				const { start, end, value } = found[i];
				const inner = minifyDocument(decodeEntities(value, true));
				// A document is not something an unquoted value can hold — a space or a
				// `>` in it would end the attribute — so one written bare gets quotes.
				const delimiter = source.charCodeAt(start - 1);
				const quoted = delimiter === 34 || delimiter === 39;
				const written = escapeAttribute(inner, quoted ? delimiter : 34, true);
				source = `${source.slice(0, start)}${quoted ? written : `"${written}"`}${source.slice(end)}`;
			}
		}
		// A downlevel-hidden conditional comment holds markup, and it cannot be
		// minified where it is found: the visitor that finds it runs inside the
		// document's own parse, and the walk state is module-scoped, so `grammar`
		// refuses to start a second one. The bodies are therefore recorded as the
		// document prints — a visitor rides the walk that prints, so this costs no
		// extra parse — and each is minified afterwards and spliced in by exact
		// source text, never by a pattern over the output, which would find a
		// `<!--[if` written inside a script.
		// The body's offsets, not its text: a body that also reads inside the
		// condition would have `replace` rewrite the condition instead.
		/** @type {Map<string, [number, number]>} */
		const conditionals = new Map();
		// One processor for both passes. It stops recording once the document is
		// printed, so a body carrying something that looks like another conditional
		// comment cannot write into the map being read below.
		let recording = true;
		const processor = new SourceProcessor();
		if (minifyConditionalComments) {
			processor.use({
				[NodeType.Comment]: (path) => {
					if (!recording) return;
					const comment = path.source();
					const opened = comment.indexOf("]>");
					const closes = comment.lastIndexOf("<![endif]");
					if (
						!/^<!--\[if\s/i.test(comment) ||
						opened === -1 ||
						closes <= opened
					) {
						return;
					}
					conditionals.set(comment, [opened + 2, closes]);
				}
			});
		}
		// `process` parses once, and with `mode: "minify"` its walk also prints the
		// safely minified serialization — no second parse. No `source` is named, so no
		// map is built: the HTML serialize is token-coarse and only the code is used.
		const { code: out } = processor.process(source, printOptions);
		recording = false;
		if (conditionals.size === 0) return out;
		let spliced = out;
		for (const [comment, [start, end]] of conditionals) {
			if (!spliced.includes(comment)) continue;
			const body = comment.slice(start, end);
			const { code: minified } = processor.process(body, printOptions);
			if (minified === body) continue;
			spliced = spliced
				.split(comment)
				.join(`${comment.slice(0, start)}${minified}${comment.slice(end)}`);
		}
		return spliced;
	};
	return { code: minifyDocument(code) };
};

// Worker-safe (see the body's in-worker `require`), so it may run in the shared
// worker-thread pool alongside terser.
htmlMinify.supportsWorkerThreads = () => true;

// When several minify functions share one `minimizer-webpack-plugin` instance,
// each asset is dispatched only to the ones whose `filter` accepts it — this
// claims HTML, so terser (JS), cssMinify and this can coexist in a single
// plugin / worker pool.
/**
 * @param {string} name asset filename
 * @returns {boolean} true for HTML assets
 */
htmlMinify.filter = (name) => /\.html(\?.*)?$/i.test(name);

module.exports = htmlMinify;
