/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const vm = require("vm");
const Parser = require("../Parser");
const ConstDependency = require("../dependencies/ConstDependency");
const HtmlInlineScriptDependency = require("../dependencies/HtmlInlineScriptDependency");
const HtmlInlineStyleDependency = require("../dependencies/HtmlInlineStyleDependency");
const HtmlScriptSrcDependency = require("../dependencies/HtmlScriptSrcDependency");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const CommentCompilationWarning = require("../errors/CommentCompilationWarning");
const ModuleDependencyError = require("../errors/ModuleDependencyError");
const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");
const WebpackError = require("../errors/WebpackError");
const LazySet = require("../util/LazySet");
const LocConverter = require("../util/LocConverter");
const createHash = require("../util/createHash");
const { contextify } = require("../util/identifier");
const {
	createMagicCommentContext,
	webpackCommentRegExp
} = require("../util/magicComment");
const buildHtmlAst = require("./buildHtmlAst");

/** @typedef {import("../../declarations/WebpackOptions").HtmlParserOptions} HtmlParserOptions */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Compilation").FileSystemDependencies} FileSystemDependencies */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

/**
 * @typedef {object} HtmlTemplateContext
 * @property {Module} module the html module being transformed
 * @property {string} resource absolute path of the module's resource
 * @property {(dependency: string) => void} addDependency register a file (e.g. a template partial) as a build dependency so editing it triggers a rebuild
 * @property {(dependency: string) => void} addContextDependency register a directory as a build dependency
 * @property {(dependency: string) => void} addMissingDependency register a not-yet-existing path as a build dependency so creating it triggers a rebuild
 * @property {(dependency: string) => void} addBuildDependency register a build dependency (e.g. a template engine config) so changing it invalidates the cache
 * @property {(warning: Error | string) => void} emitWarning report a non-fatal warning on the module
 * @property {(error: Error | string) => void} emitError report an error on the module
 */
/** @typedef {(source: string, context: HtmlTemplateContext) => string} HtmlTemplateFunction */

const HORIZONTAL_TAB = "\u0009".charCodeAt(0);
const NEWLINE = "\u000A".charCodeAt(0);
const FORM_FEED = "\u000C".charCodeAt(0);
const CARRIAGE_RETURN = "\u000D".charCodeAt(0);
const SPACE = "\u0020".charCodeAt(0);
const COMMA = ",".charCodeAt(0);
const LEFT_PARENTHESIS = "(".charCodeAt(0);
const RIGHT_PARENTHESIS = ")".charCodeAt(0);
const SMALL_LETTER_W = "w".charCodeAt(0);
const SMALL_LETTER_X = "x".charCodeAt(0);
const SMALL_LETTER_H = "h".charCodeAt(0);

/**
 * @param {number} char char
 * @returns {boolean} true when ASCII whitespace, otherwise false
 */
function isASCIIWhitespace(char) {
	return (
		// Horizontal tab
		char === HORIZONTAL_TAB ||
		// New line
		char === NEWLINE ||
		// Form feed
		char === FORM_FEED ||
		// Carriage return
		char === CARRIAGE_RETURN ||
		// Space
		char === SPACE
	);
}

/** @typedef {[string, number, number]} ParsedSource */

// eslint-disable-next-line no-control-regex
const IGNORE_CHARS_REGEXP = /[\u0000-\u001F\u007F-\u009F\u00A0]/g;

/**
 * @param {string} input input
 * @returns {ParsedSource[]} parsed src
 */
const parseSrc = (input) => {
	const len = input.length;
	if (len === 0) throw new Error("Must be non-empty");

	let start = 0;
	let end = len;

	while (start < end) {
		const code = input.charCodeAt(start);
		if (code > 32 && code !== 160) break;
		start++;
	}

	if (start === end) throw new Error("Must be non-empty");

	while (end > start) {
		const code = input.charCodeAt(end - 1);
		if (code > 32 && code !== 160) break;
		end--;
	}

	let value = input.slice(start, end);

	if (IGNORE_CHARS_REGEXP.test(value)) {
		value = value.replace(IGNORE_CHARS_REGEXP, "");
		if (value.length === 0) throw new Error("Must be non-empty");
	}

	return [[value, start, end]];
};

// (Don't use \s, to avoid matching non-breaking space)
// eslint-disable-next-line no-control-regex
const LEADING_SPACES_REGEXP = /^[ \t\n\r\u000C]+/;
// eslint-disable-next-line no-control-regex
const LEADING_COMMAS_OR_SPACES_REGEXP = /^[, \t\n\r\u000C]+/;
// eslint-disable-next-line no-control-regex
const LEADING_NOT_SPACES = /^[^ \t\n\r\u000C]+/;
const TRAILING_COMMAS_REGEXP = /[,]+$/;
const NON_NEGATIVE_INTEGER_REGEXP = /^\d+$/;
// ( Positive or negative or unsigned integers or decimals, without or without exponents.
// Must include at least one digit.
// According to spec tests any decimal point must be followed by a digit.
// No leading plus sign is allowed.)
// https://html.spec.whatwg.org/multipage/infrastructure.html#valid-floating-point-number
const FLOATING_POINT_REGEXP =
	/^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

/**
 * @param {string} input input
 * @returns {ParsedSource[]} parsed srcset
 */
const parseSrcset = (input) => {
	// 1. Let input be the value passed to this algorithm.
	const inputLength = input.length;

	/** @type {string | undefined} */
	let url;
	/** @type {string[]} */
	let descriptors;
	/** @type {string} */
	let currentDescriptor;
	/** @type {string} */
	let state;
	/** @type {number} */
	let charCode;
	/** @type {number} */
	let position = 0;
	/** @type {number} */
	let start;

	/** @type {[string, number, number][]} */
	const candidates = [];

	/**
	 * @param {RegExp} regExp reg exp to collect characters
	 * @returns {string | undefined} characters
	 */
	function collectCharacters(regExp) {
		/** @type {string} */
		let chars;
		const match = regExp.exec(input.slice(Math.max(0, position)));

		if (match) {
			[chars] = match;
			position += chars.length;

			return chars;
		}
	}

	/**
	 * @returns {void}
	 */
	function parseDescriptors() {
		// 9. Descriptor parser: Let error be no.
		let pError = false;

		// 10. Let width be absent.
		// 11. Let density be absent.
		// 12. Let future-compat-h be absent. (We're implementing it now as h)
		/** @type {number | undefined} */
		let width;
		/** @type {number | undefined} */
		let density;
		/** @type {number | undefined} */
		let height;
		/** @type {string | undefined} */
		let desc;

		// 13. For each descriptor in descriptors, run the appropriate set of steps
		// from the following list:
		for (let i = 0; i < descriptors.length; i++) {
			desc = descriptors[i];

			const lastChar = desc[desc.length - 1].charCodeAt(0);
			const value = desc.slice(0, Math.max(0, desc.length - 1));

			// If the descriptor consists of a valid non-negative integer followed by
			// a U+0077 LATIN SMALL LETTER W character
			if (
				NON_NEGATIVE_INTEGER_REGEXP.test(value) &&
				lastChar === SMALL_LETTER_W
			) {
				// If width and density are not both absent, then let error be yes.
				if (width || density) {
					pError = true;
				}

				const intVal = Number.parseInt(value, 10);

				// Apply the rules for parsing non-negative integers to the descriptor.
				// If the result is zero, let error be yes.
				// Otherwise, let width be the result.
				if (intVal === 0) {
					pError = true;
				} else {
					width = intVal;
				}
			}
			// If the descriptor consists of a valid floating-point number followed by
			// a U+0078 LATIN SMALL LETTER X character
			else if (
				FLOATING_POINT_REGEXP.test(value) &&
				lastChar === SMALL_LETTER_X
			) {
				// If width, density and future-compat-h are not all absent, then let error
				// be yes.
				if (width || density || height) {
					pError = true;
				}

				const floatVal = Number.parseFloat(value);

				// Apply the rules for parsing floating-point number values to the descriptor.
				// If the result is less than zero, let error be yes. Otherwise, let density
				// be the result.
				if (floatVal < 0) {
					pError = true;
				} else {
					density = floatVal;
				}
			}
			// If the descriptor consists of a valid non-negative integer followed by
			// a U+0068 LATIN SMALL LETTER H character
			else if (
				NON_NEGATIVE_INTEGER_REGEXP.test(value) &&
				lastChar === SMALL_LETTER_H
			) {
				// If height and density are not both absent, then let error be yes.
				if (height || density) {
					pError = true;
				}

				const intVal = Number.parseInt(value, 10);

				// Apply the rules for parsing non-negative integers to the descriptor.
				// If the result is zero, let error be yes. Otherwise, let future-compat-h
				// be the result.
				if (intVal === 0) {
					pError = true;
				} else {
					height = intVal;
				}

				// Anything else, Let error be yes.
			} else {
				pError = true;
			}
		}

		// 15. If error is still no, then append a new image source to candidates whose
		// URL is url, associated with a width width if not absent and a pixel
		// density density if not absent. Otherwise, there is a parse error.
		if (!pError) {
			candidates.push([
				/** @type {string} */ (url),
				start,
				start + /** @type {string} */ (url).length
			]);
		} else {
			throw new Error(
				`Invalid srcset descriptor found in '${input}' at '${desc}'`
			);
		}
	}

	/**
	 * @returns {void}
	 */
	function tokenize() {
		// 8.1. Descriptor tokenizer: Skip whitespace
		collectCharacters(LEADING_SPACES_REGEXP);

		// 8.2. Let current descriptor be the empty string.
		currentDescriptor = "";

		// 8.3. Let state be in descriptor.
		state = "in descriptor";

		while (true) {
			// 8.4. Let charCode be the character at position.
			charCode = input.charCodeAt(position);

			//  Do the following depending on the value of state.
			//  For the purpose of this step, "EOF" is a special character representing
			//  that position is past the end of input.

			// In descriptor
			if (state === "in descriptor") {
				// Do the following, depending on the value of charCode:

				// Space character
				// If current descriptor is not empty, append current descriptor to
				// descriptors and let current descriptor be the empty string.
				// Set state to after descriptor.
				if (isASCIIWhitespace(charCode)) {
					if (currentDescriptor) {
						descriptors.push(currentDescriptor);
						currentDescriptor = "";
						state = "after descriptor";
					}
				}
				// U+002C COMMA (,)
				// Advance position to the next character in input. If current descriptor
				// is not empty, append current descriptor to descriptors. Jump to the step
				// labeled descriptor parser.
				else if (charCode === COMMA) {
					position += 1;

					if (currentDescriptor) {
						descriptors.push(currentDescriptor);
					}

					parseDescriptors();

					return;
				}
				// U+0028 LEFT PARENTHESIS (()
				// Append charCode to current descriptor. Set state to in parens.
				else if (charCode === LEFT_PARENTHESIS) {
					currentDescriptor += input.charAt(position);
					state = "in parens";
				}
				// EOF
				// If current descriptor is not empty, append current descriptor to
				// descriptors. Jump to the step labeled descriptor parser.
				else if (Number.isNaN(charCode)) {
					if (currentDescriptor) {
						descriptors.push(currentDescriptor);
					}

					parseDescriptors();

					return;

					// Anything else
					// Append charCode to current descriptor.
				} else {
					currentDescriptor += input.charAt(position);
				}
			}
			// In parens
			else if (state === "in parens") {
				// U+0029 RIGHT PARENTHESIS ())
				// Append charCode to current descriptor. Set state to in descriptor.
				if (charCode === RIGHT_PARENTHESIS) {
					currentDescriptor += input.charAt(position);
					state = "in descriptor";
				}
				// EOF
				// Append current descriptor to descriptors. Jump to the step labeled
				// descriptor parser.
				else if (Number.isNaN(charCode)) {
					descriptors.push(currentDescriptor);
					parseDescriptors();
					return;
				}
				// Anything else
				// Append charCode to current descriptor.
				else {
					currentDescriptor += input.charAt(position);
				}
			}
			// After descriptor
			else if (state === "after descriptor") {
				// Do the following, depending on the value of charCode:
				if (isASCIIWhitespace(charCode)) {
					// Space character: Stay in this state.
				}
				// EOF: Jump to the step labeled descriptor parser.
				else if (Number.isNaN(charCode)) {
					parseDescriptors();
					return;
				}
				// Anything else
				// Set state to in descriptor. Set position to the previous character in input.
				else {
					state = "in descriptor";
					position -= 1;
				}
			}

			// Advance position to the next character in input.
			position += 1;
		}
	}

	// 3. Let candidates be an initially empty source set.
	// const candidates = []; // Moved to top

	// 4. Splitting loop: Collect a sequence of characters that are space
	//    characters or U+002C COMMA characters. If any U+002C COMMA characters
	//    were collected, that is a parse error.

	while (true) {
		collectCharacters(LEADING_COMMAS_OR_SPACES_REGEXP);

		// 5. If position is past the end of input, return candidates and abort these steps.
		if (position >= inputLength) {
			if (candidates.length === 0) {
				throw new Error("Must contain one or more image candidate strings");
			}

			// (we're done, this is the sole return path)
			return candidates;
		}

		// 6. Collect a sequence of characters that are not space characters,
		//    and let that be url.
		start = position;
		url = collectCharacters(LEADING_NOT_SPACES);

		// 7. Let descriptors be a new empty list.
		descriptors = [];

		// 8. If url ends with a U+002C COMMA character (,), follow these sub steps:
		//		(1). Remove all trailing U+002C COMMA characters from url. If this removed
		//         more than one character, that is a parse error.
		if (url && url.charCodeAt(url.length - 1) === COMMA) {
			url = url.replace(TRAILING_COMMAS_REGEXP, "");

			// (Jump ahead to step 9 to skip tokenization and just push the candidate).
			parseDescriptors();
		}
		//	Otherwise, follow these sub steps:
		else {
			tokenize();
		}

		// 16. Return to the step labeled splitting loop.
	}
};

/**
 * @param {Map<string, string>} attributes attributes
 * @param {string} name name
 * @returns {string | undefined} attribute value
 */
const getAttributeValue = (attributes, name) => attributes.get(name);

/** @type {Map<string, Set<string>>} */
const META = new Map([
	[
		"name",
		new Set([
			// msapplication-TileImage
			"msapplication-tileimage",
			"msapplication-square70x70logo",
			"msapplication-square150x150logo",
			"msapplication-wide310x150logo",
			"msapplication-square310x310logo",
			"msapplication-config",
			"twitter:image"
		])
	],
	[
		"property",
		new Set([
			"og:image",
			"og:image:url",
			"og:image:secure_url",
			"og:audio",
			"og:audio:secure_url",
			"og:video",
			"og:video:secure_url",
			"vk:image"
		])
	],
	[
		"itemprop",
		new Set([
			"image",
			"logo",
			"screenshot",
			"thumbnailurl",
			"contenturl",
			"downloadurl",
			"duringmedia",
			"embedurl",
			"installurl",
			"layoutimage"
		])
	]
]);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkItemprop = (attributes) => {
	const value = getAttributeValue(attributes, "itemprop");
	if (!value) return false;
	const allowedAttributes = META.get("itemprop");
	if (!allowedAttributes) return false;

	return allowedAttributes.has(value.trim().toLowerCase());
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkHref = (attributes) => {
	const rel = getAttributeValue(attributes, "rel");
	if (!rel) return false;
	const usedRels = rel.trim().toLowerCase().split(" ").filter(Boolean);
	const allowedRels = [
		"stylesheet",
		"icon",
		"mask-icon",
		"apple-touch-icon",
		"apple-touch-icon-precomposed",
		"apple-touch-startup-image",
		"manifest",
		"prefetch",
		"preload",
		"modulepreload"
	];

	return allowedRels.some((value) => usedRels.includes(value));
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkUnion = (attributes) =>
	filterLinkHref(attributes) || filterLinkItemprop(attributes);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterMetaContent = (attributes) => {
	for (const item of META) {
		const [key, allowedNames] = item;
		const name = getAttributeValue(attributes, key);
		if (!name) continue;

		return allowedNames.has(name.trim().toLowerCase());
	}

	return false;
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the script element opts into ES module semantics
 */
const isModuleScript = (attributes) => {
	const type = getAttributeValue(attributes, "type");
	if (!type) return false;
	return type.trim().toLowerCase() === "module";
};

// HTML `<script>` `type` values that the browser treats as executable
// JavaScript. Anything outside this set (e.g. `application/ld+json`,
// `importmap`, `application/wasm`) is a data block — webpack must not
// try to bundle it as a JS entry; it should pass through as an asset URL.
const JS_SCRIPT_TYPES = new Set([
	"",
	"module",
	"text/javascript",
	"application/javascript",
	"text/ecmascript",
	"application/ecmascript"
]);

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the script element's `type` is executable JS
 */
const isExecutableJsScript = (attributes) => {
	const type = getAttributeValue(attributes, "type");
	if (type === undefined) return true;
	return JS_SCRIPT_TYPES.has(type.trim().toLowerCase());
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the link points at an ES module that should be bundled as an entry chunk
 */
const isLinkModulePreload = (attributes) => {
	const rel = getAttributeValue(attributes, "rel");
	if (!rel) return false;
	return rel.trim().toLowerCase().split(/\s+/).includes("modulepreload");
};

/**
 * @param {Map<string, string>} attributes attributes
 * @returns {boolean} true when the link is a `<link rel="stylesheet">` that should be bundled as a CSS entry chunk
 */
const isLinkStylesheet = (attributes) => {
	const rel = getAttributeValue(attributes, "rel");
	if (!rel) return false;
	return rel.trim().toLowerCase().split(/\s+/).includes("stylesheet");
};

/** @typedef {"src" | "srcset" | "script" | "script-module" | "modulepreload" | "stylesheet" | "stylesheet-inline"} SourceType */
/** @typedef {SourceType | ((attrs: Map<string, string>, css: boolean) => SourceType)} SourceTypeOrResolver */
/** @typedef {{ tag?: string, attribute: string, type: SourceType, filter?: (attributes: Map<string, string>) => boolean }} SourceEntry */
/** @typedef {{ type: SourceTypeOrResolver, filter?: (attributes: Map<string, string>) => boolean }} SourceItem */

/**
 * Builds a null-prototype dictionary from the given property bags
 * (later bags win; `undefined` bags are skipped). A null prototype is
 * essential here: the tables are indexed by HTML tag and attribute
 * names, so a plain object would let names like `__proto__`,
 * `constructor`, or `toString` resolve to inherited values at lookup
 * time — producing bogus dependencies and letting `sources: false` be
 * bypassed.
 * @param {...(Record<string, EXPECTED_ANY> | undefined)} bags property bags
 * @returns {EXPECTED_ANY} null-prototype dictionary
 */
const dict = (...bags) => Object.assign(Object.create(null), ...bags);

// Shared `SourceItem` singletons used by the built-in defaults —
// keeping one instance per kind stabilizes V8's hidden classes across
// lookups in the walk. `srcset` is its own type; the walk picks the
// `parseSrcset` parser for it and otherwise treats it like `src`.
/** @type {SourceItem} */
const PLAIN_SRC = { type: "src", filter: undefined };
/** @type {SourceItem} */
const PLAIN_SRCSET = { type: "srcset", filter: undefined };

/**
 * `<link href>` is polymorphic: `rel="modulepreload"` → an ESM
 * preload entry, `rel="stylesheet"` (with `experiments.css`) → a CSS
 * entry, otherwise a plain asset URL.
 * @type {SourceItem}
 */
const LINK_HREF = {
	type: (attrs, css) => {
		if (isLinkModulePreload(attrs)) return "modulepreload";
		if (css && isLinkStylesheet(attrs)) return "stylesheet";
		return "src";
	},
	filter: filterLinkUnion
};

/**
 * `<script src>`: non-JS types (e.g. `application/ld+json`,
 * `importmap`) stay plain asset URLs so the browser keeps seeing them
 * as data blocks; `type="module"` opts into the ESM entry chunk;
 * everything else in `JS_SCRIPT_TYPES` is a classic script.
 * @type {SourceItem}
 */
const SCRIPT_SRC = {
	type: (attrs) =>
		isExecutableJsScript(attrs)
			? isModuleScript(attrs)
				? "script-module"
				: "script"
			: "src",
	filter: undefined
};

// Built-in lookup table, written directly in its final resolved shape:
// `DEFAULT_SOURCES_BY_TAG[tag][attribute] = item`. No module-load
// loop, no separate array representation — every parser created with
// the default `sources` config just references this table and pays
// zero per-parser work.
/** @type {Record<string, Record<string, SourceItem>>} */
const DEFAULT_SOURCES_BY_TAG = dict({
	audio: dict({ src: PLAIN_SRC }),
	embed: dict({ src: PLAIN_SRC }),
	img: dict({ src: PLAIN_SRC, srcset: PLAIN_SRCSET }),
	input: dict({ src: PLAIN_SRC }),
	link: dict({
		href: LINK_HREF,
		imagesrcset: { type: "srcset", filter: filterLinkHref }
	}),
	meta: dict({ content: { type: "src", filter: filterMetaContent } }),
	object: dict({ data: PLAIN_SRC }),
	script: dict({ src: SCRIPT_SRC }),
	source: dict({ src: PLAIN_SRC, srcset: PLAIN_SRCSET }),
	track: dict({ src: PLAIN_SRC }),
	video: dict({ poster: PLAIN_SRC, src: PLAIN_SRC }),
	// SVG
	image: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC }),
	use: dict({ "xlink:href": PLAIN_SRC, href: PLAIN_SRC })
});

/** @type {Record<string, Record<string, SourceItem>>} */
const EMPTY_SOURCES_BY_TAG = dict();

class HtmlParser extends Parser {
	/**
	 * Creates an instance of HtmlParser.
	 * @param {HtmlParserOptions} options parser options (from `module.parser.html`; always passed by the `createParser` hook)
	 */
	constructor(options) {
		super();
		this.magicCommentContext = createMagicCommentContext();
		// Read by HtmlModulesPlugin's `processResult` hook, which transforms
		// the module source before it is stored and parsed.
		/** @type {HtmlTemplateFunction | undefined} */
		this.template = options.template;
		// Default state — referenced directly by the common case. The
		// `false` and user-array branches below overwrite `sourcesByTag`
		// (and, for an array, may set `anyTagSources`).
		this.sourcesByTag = DEFAULT_SOURCES_BY_TAG;
		this.anyTagSources = undefined;

		const sources = options.sources;
		if (sources === undefined || sources === true) return;
		if (sources === false) {
			this.sourcesByTag = EMPTY_SOURCES_BY_TAG;
			return;
		}

		// User array — build per-tag and any-tag tables. `"..."` anywhere
		// in the array opts the defaults in as the base; user entries
		// always override regardless of position. `dict()` keeps every
		// table null-prototype (see its doc), and per-tag writes rebuild
		// the bucket so the aliased default buckets stay untouched.
		/** @type {Record<string, Record<string, SourceItem>>} */
		const byTag = sources.includes("...")
			? dict(DEFAULT_SOURCES_BY_TAG)
			: dict();
		/** @type {Record<string, SourceItem> | undefined} */
		let anyTag;
		for (const entry of sources) {
			if (entry === "...") continue;
			/** @type {SourceItem} */
			const item = {
				type: entry.type,
				filter: typeof entry.filter === "function" ? entry.filter : undefined
			};
			const attr = entry.attribute.toLowerCase();
			if (entry.tag === undefined) {
				anyTag = dict(anyTag, { [attr]: item });
			} else {
				const tag = entry.tag.toLowerCase();
				byTag[tag] = dict(byTag[tag], { [attr]: item });
			}
		}
		// Fold any-tag entries into every per-tag bucket as a base so
		// the walk's per-attribute lookup is one property read.
		// Tag-specific entries still win (they're the later `dict` bag).
		if (anyTag) {
			for (const tag of Object.keys(byTag)) {
				byTag[tag] = dict(anyTag, byTag[tag]);
			}
		}
		this.sourcesByTag = byTag;
		this.anyTagSources = anyTag;
	}

	/**
	 * Runs the `template` option over the source and returns the transformed
	 * html. Called from HtmlModulesPlugin's `processResult`, where the return
	 * value becomes the module's stored source so the parser (which records
	 * dependency offsets against it) and the generator (which renders from
	 * `module.originalSource()`) stay in agreement.
	 * @param {string | Buffer} source the original source
	 * @param {NormalModule} module the html module
	 * @returns {string | Buffer} the transformed source
	 */
	applyTemplate(source, module) {
		if (!this.template) return source;
		// `processResult` runs after `_doBuild` has initialized these
		// dependency sets, so they are always present here.
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		const fileDependencies = /** @type {FileSystemDependencies} */ (
			buildInfo.fileDependencies
		);
		const contextDependencies = /** @type {FileSystemDependencies} */ (
			buildInfo.contextDependencies
		);
		const missingDependencies = /** @type {FileSystemDependencies} */ (
			buildInfo.missingDependencies
		);
		const transformed = this.template(
			typeof source === "string" ? source : source.toString("utf8"),
			{
				module,
				resource: module.resource,
				addDependency: (dependency) => {
					fileDependencies.add(dependency);
				},
				addContextDependency: (dependency) => {
					contextDependencies.add(dependency);
				},
				addMissingDependency: (dependency) => {
					missingDependencies.add(dependency);
				},
				addBuildDependency: (dependency) => {
					if (buildInfo.buildDependencies === undefined) {
						buildInfo.buildDependencies = new LazySet();
					}
					buildInfo.buildDependencies.add(dependency);
				},
				emitWarning: (warning) =>
					module.addWarning(
						warning instanceof Error ? warning : new WebpackError(warning)
					),
				emitError: (error) =>
					module.addError(
						error instanceof Error ? error : new WebpackError(error)
					)
			}
		);
		if (typeof transformed !== "string") {
			throw new Error(
				"The `template` html parser option must return a string."
			);
		}
		return transformed;
	}

	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf8");
		} else if (typeof source === "object") {
			throw new Error("webpackAst is unexpected for the HtmlParser");
		}
		if (source[0] === "\uFEFF") {
			source = source.slice(1);
		}

		const locConverter = new LocConverter(source);

		const module = state.module;
		const compilation = state.compilation;
		const { hashFunction, module: outputModule } = compilation.outputOptions;
		const context = compilation.compiler.context;
		const css = Boolean(compilation.options.experiments.css);

		// Stable, per-HTML-module prefix used when generating entry names for
		// script src / modulepreload references so they don't collide across
		// HTML modules in the same compilation. We hash the module's resource
		// path (a plain absolute path) — going through `contextify` against
		// the compilation root keeps the hash machine-stable for the same
		// project layout. Note: `module.identifier()` returns `html|<path>`
		// for HTML modules, which doesn't start with `/`, so contextify would
		// leave it absolute. `module.resource` is the bare path.
		/** @type {string} */
		const resource =
			/** @type {EXPECTED_ANY} */ (module).resource || module.identifier();
		const moduleHash = createHash(hashFunction || "md4")
			.update(context ? contextify(context, resource) : resource)
			.digest("hex")
			.slice(0, 8);

		// Script src / modulepreload references are collected per-type
		// during the walk; HtmlModulesPlugin later turns them into real
		// entries. `script` and `script-module` entries are chained via a
		// leader-only dependOn so they share a runtime.
		// `<link rel="modulepreload">` entries are kept independent — they
		// must preload without running, so they can never become a runtime
		// leader that other entries would import.
		/**
		 * @typedef {object} EntryScriptInfo
		 * @property {string} request
		 * @property {string} entryName
		 * @property {"script" | "script-module" | "modulepreload" | "stylesheet"} type
		 */
		/** @type {EntryScriptInfo[]} */
		const scriptEntries = [];
		/** @type {EntryScriptInfo[]} */
		const scriptModuleEntries = [];
		/** @type {EntryScriptInfo[]} */
		const modulePreloadEntries = [];
		/** @type {EntryScriptInfo[]} */
		const stylesheetEntries = [];

		let nextEntryIndex = 0;

		/**
		 * Tracks the `webpackIgnore` value from the most recent comment that
		 * appears before the next tag. Reset whenever a tag is emitted or a
		 * comment without a `webpackIgnore` value is encountered.
		 * @type {boolean | undefined}
		 */
		let pendingWebpackIgnore;

		const magicCommentContext = this.magicCommentContext;

		// TODO implement full HTML parser (WASM)
		const doc = buildHtmlAst(source);

		/**
		 * @param {import("./buildHtmlAst").HtmlAttribute | undefined} typeAttr type attribute
		 * @param {number} nameEnd end offset of the tag name
		 * @param {string} type type of the script
		 * @param {string} input source string
		 */
		const reconcileScriptTypeAttr = (typeAttr, nameEnd, type, input) => {
			if (outputModule && type === "script") {
				// Chunk is an ES module; upgrade the tag.
				if (typeAttr && typeAttr.valueStart !== -1) {
					module.addPresentationalDependency(
						new ConstDependency("module", [
							typeAttr.valueStart,
							typeAttr.valueEnd
						])
					);
				} else {
					module.addPresentationalDependency(
						new ConstDependency(' type="module"', nameEnd)
					);
				}
			} else if (!outputModule && type === "script-module" && typeAttr) {
				// Chunk is a classic IIFE; drop `type="module"` so the
				// browser doesn't load it under module semantics.
				let attrEnd;
				if (typeAttr.valueStart === -1) {
					attrEnd = typeAttr.nameEnd;
				} else if (
					input[typeAttr.valueEnd] === '"' ||
					input[typeAttr.valueEnd] === "'"
				) {
					attrEnd = typeAttr.valueEnd + 1;
				} else {
					attrEnd = typeAttr.valueEnd;
				}
				let attrStart = typeAttr.nameStart;
				if (
					attrStart > 0 &&
					isASCIIWhitespace(input.charCodeAt(attrStart - 1))
				) {
					attrStart -= 1;
				}
				module.addPresentationalDependency(
					new ConstDependency("", [attrStart, attrEnd])
				);
			}
		};

		/**
		 * @param {import("./buildHtmlAst").HtmlNode[]} children children
		 * @returns {void}
		 */
		const walkChildren = (children) => {
			for (const child of children) walkNode(child);
			pendingWebpackIgnore = undefined;
		};

		/** @param {import("./buildHtmlAst").HtmlNode} node AST node */
		const walkNode = (node) => {
			if (node.type === "comment") {
				// Only proper `<!-- ... -->` comments carry magic comments.
				if (
					node.end - node.start < 7 ||
					source.charCodeAt(node.start) !== 0x3c ||
					source.charCodeAt(node.start + 1) !== 0x21 ||
					source.charCodeAt(node.start + 2) !== 0x2d ||
					source.charCodeAt(node.start + 3) !== 0x2d ||
					source.charCodeAt(node.end - 1) !== 0x3e ||
					source.charCodeAt(node.end - 2) !== 0x2d ||
					source.charCodeAt(node.end - 3) !== 0x2d
				) {
					pendingWebpackIgnore = undefined;
					return;
				}
				const value = node.data;
				if (!webpackCommentRegExp.test(value)) {
					pendingWebpackIgnore = undefined;
					return;
				}
				/** @type {Record<string, EXPECTED_ANY>} */
				let options;
				try {
					options = vm.runInContext(
						`(function(){return {${value}};})()`,
						magicCommentContext
					);
				} catch (err) {
					const { line: sl, column: sc } = locConverter.get(node.start);
					const { line: el, column: ec } = locConverter.get(node.end);
					module.addWarning(
						new CommentCompilationWarning(
							`Compilation error while processing magic comment(-s): /*${value}*/: ${
								/** @type {Error} */ (err).message
							}`,
							{
								start: { line: sl, column: sc },
								end: { line: el, column: ec }
							}
						)
					);
					pendingWebpackIgnore = undefined;
					return;
				}
				if (options.webpackIgnore === undefined) {
					pendingWebpackIgnore = undefined;
					return;
				}
				if (typeof options.webpackIgnore !== "boolean") {
					const { line: sl, column: sc } = locConverter.get(node.start);
					const { line: el, column: ec } = locConverter.get(node.end);
					module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackIgnore\` expected a boolean, but received: ${options.webpackIgnore}.`,
							{
								start: { line: sl, column: sc },
								end: { line: el, column: ec }
							}
						)
					);
					pendingWebpackIgnore = undefined;
					return;
				}
				pendingWebpackIgnore = options.webpackIgnore;
				return;
			}

			if (node.type === "doctype") {
				pendingWebpackIgnore = undefined;
				return;
			}

			if (node.type === "text") {
				return;
			}

			if (node.type !== "element") return;

			const ignore = pendingWebpackIgnore === true;
			pendingWebpackIgnore = undefined;

			if (ignore) {
				walkChildren(node.children);
				return;
			}

			const elementName = node.tagName;
			const attrs = node.attributes;

			/** @type {Map<string, string> | undefined} */
			let attributesMap;
			const getAttributesMap = () => {
				if (attributesMap) return attributesMap;
				attributesMap = new Map();
				for (const attr of attrs) {
					attributesMap.set(attr.name, attr.value);
				}
				return attributesMap;
			};

			if (elementName === "style") {
				/** @type {string | undefined} */
				let typeValue;
				for (const attr of attrs) {
					if (attr.name === "type") {
						typeValue = attr.value;
						break;
					}
				}

				const trimmedType =
					typeValue !== undefined ? typeValue.trim().toLowerCase() : "";
				if (
					typeValue !== undefined &&
					trimmedType !== "" &&
					trimmedType !== "text/css"
				) {
					walkChildren(node.children);
					return;
				}

				if (!css) {
					walkChildren(node.children);
					return;
				}

				/** @type {number | undefined} */
				let contentStart;
				let contentEnd = node.tagEnd;
				for (const child of node.children) {
					if (child.type === "text") {
						if (contentStart === undefined) {
							contentStart = child.start;
						}
						contentEnd = child.end;
					}
				}

				if (contentStart === undefined) {
					contentStart = node.tagEnd;
				}

				const cssContent = source.slice(contentStart, contentEnd);
				if (cssContent.trim() === "") {
					walkChildren(node.children);
					return;
				}

				const request = `data:text/css;base64,${Buffer.from(cssContent, "utf8").toString("base64")}`;

				const { line: sl, column: sc } = locConverter.get(contentStart);
				const { line: el, column: ec } = locConverter.get(contentEnd);
				const dep = new HtmlInlineStyleDependency(request, [
					contentStart,
					contentEnd
				]);
				dep.setLoc(sl, sc, el, ec);
				module.addDependency(dep);
				module.addCodeGenerationDependency(dep);
				walkChildren(node.children);
				return;
			}

			const tagSources = this.sourcesByTag[elementName] || this.anyTagSources;
			if (!tagSources && elementName !== "script") {
				walkChildren(node.children);
				return;
			}

			for (const attr of tagSources ? attrs : []) {
				const sourceItem = tagSources[attr.name];
				if (!sourceItem) continue;

				// Attributes on adoption-agency clones carry no source offsets;
				// the original element already owns the dependency span.
				if (attr.valueStart === undefined || attr.valueStart === -1) continue;

				const attributeValue = attr.value;
				if (!attributeValue || !/\S/.test(attributeValue)) continue;

				if (
					typeof sourceItem.filter === "function" &&
					!sourceItem.filter(getAttributesMap())
				) {
					continue;
				}

				const type =
					typeof sourceItem.type === "function"
						? sourceItem.type(getAttributesMap(), css)
						: sourceItem.type;
				const parse = type === "srcset" ? parseSrcset : parseSrc;

				if (type === "stylesheet-inline") {
					if (attributeValue.trim() === "") continue;
					const request = `data:text/css;base64,${Buffer.from(attributeValue, "utf8").toString("base64")}`;
					const { line: sl, column: sc } = locConverter.get(attr.valueStart);
					const { line: el, column: ec } = locConverter.get(attr.valueEnd);
					const dep = new HtmlInlineStyleDependency(request, [
						attr.valueStart,
						attr.valueEnd
					]);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					module.addCodeGenerationDependency(dep);
					continue;
				}

				/** @type {ParsedSource[] | undefined} */
				let parsedAttributeValue;

				try {
					parsedAttributeValue = parse(attributeValue);
				} catch (err) {
					const { line: sl, column: sc } = locConverter.get(attr.valueStart);
					const { line: el, column: ec } = locConverter.get(attr.valueEnd);

					module.addError(
						new ModuleDependencyError(
							module,
							new WebpackError(
								`Bad value for attribute "${attr.name}" on element "${elementName}": ${
									/** @type {Error} */ (err).message
								}`
							),
							{
								start: { line: sl, column: sc },
								end: { line: el, column: ec }
							}
						)
					);
				}

				if (!parsedAttributeValue) continue;

				for (const parsedSource of parsedAttributeValue) {
					const [value, innerStart, innerEnd] = parsedSource;
					if (value.startsWith("#")) continue;
					const sourceStart = attr.valueStart + innerStart;
					const sourceEnd = attr.valueStart + innerEnd;
					const { line: sl, column: sc } = locConverter.get(sourceStart);
					const { line: el, column: ec } = locConverter.get(sourceEnd);
					if (type === "src" || type === "srcset") {
						const dep = new HtmlSourceDependency(value, [
							sourceStart,
							sourceEnd
						]);
						dep.setLoc(sl, sc, el, ec);
						module.addDependency(dep);
						module.addCodeGenerationDependency(dep);
						continue;
					}

					const entryName = `__html_${moduleHash}_${nextEntryIndex++}`;
					const willBeModuleScript =
						type === "script-module" || (outputModule && type === "script");
					/** @type {"script" | "script-module" | "modulepreload" | "stylesheet"} */
					const elementKind =
						type === "modulepreload"
							? "modulepreload"
							: type === "stylesheet"
								? "stylesheet"
								: willBeModuleScript
									? "script-module"
									: "script";
					const entryCategory =
						type === "stylesheet"
							? "css-import"
							: type === "script-module" || type === "modulepreload"
								? "esm"
								: undefined;
					const dep = new HtmlScriptSrcDependency(
						value,
						[sourceStart, sourceEnd],
						entryName,
						entryCategory,
						elementKind,
						node.start,
						node.tagEnd
					);
					dep.setLoc(sl, sc, el, ec);
					module.addPresentationalDependency(dep);
					if (
						elementName === "script" &&
						(type === "script" || type === "script-module")
					) {
						const typeAttr = attrs.find((a) => a.name === "type");
						reconcileScriptTypeAttr(typeAttr, node.nameEnd, type, source);
					}
					const collection =
						type === "script"
							? scriptEntries
							: type === "script-module"
								? scriptModuleEntries
								: type === "stylesheet"
									? stylesheetEntries
									: modulePreloadEntries;
					collection.push({ request: value, entryName, type });
				}
			}

			if (elementName === "script") {
				const scriptAttrs = getAttributesMap();
				const hasSrc = scriptAttrs.has("src");

				if (!hasSrc && isExecutableJsScript(scriptAttrs)) {
					let contentStart = node.tagEnd;
					let contentEnd = node.tagEnd;
					let hasSeenTextChild = false;
					for (const child of node.children) {
						if (child.type === "text") {
							if (!hasSeenTextChild) {
								contentStart = child.start;
								hasSeenTextChild = true;
							}
							contentEnd = child.end;
						}
					}

					const jsContent = source.slice(contentStart, contentEnd);
					if (jsContent.trim() !== "") {
						const request = `data:text/javascript;base64,${Buffer.from(
							jsContent,
							"utf8"
						).toString("base64")}`;

						const useEsmEntry = isModuleScript(scriptAttrs);
						const entryName = `__html_${moduleHash}_${nextEntryIndex++}`;
						/** @type {"script" | "script-module"} */
						const type = useEsmEntry ? "script-module" : "script";
						const { line: sl, column: sc } = locConverter.get(contentStart);
						const { line: el, column: ec } = locConverter.get(contentEnd);
						const dep = new HtmlInlineScriptDependency(
							request,
							node.nameEnd,
							[contentStart, contentEnd],
							entryName,
							useEsmEntry ? "esm" : "commonjs"
						);
						dep.setLoc(sl, sc, el, ec);
						module.addPresentationalDependency(dep);

						const typeAttr = attrs.find((a) => a.name === "type");
						reconcileScriptTypeAttr(typeAttr, node.nameEnd, type, source);

						const collection =
							type === "script" ? scriptEntries : scriptModuleEntries;
						collection.push({ request, entryName, type });
					}
				}
			}

			walkChildren(node.children);
		};

		for (const child of doc.children) walkNode(child);

		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		buildInfo.strict = true;
		// Hand off the collected entries to HtmlModulesPlugin; it creates the
		// real compilation entries during the finishMake hook. The `script`
		// and `script-module` groups are chained via a leader-only dependOn
		// so they share a runtime; `modulepreload` and `stylesheet` entries
		// are emitted as independent entries since `<link rel=modulepreload>`
		// must preload without running and stylesheets have no runtime.
		if (
			scriptEntries.length > 0 ||
			scriptModuleEntries.length > 0 ||
			modulePreloadEntries.length > 0 ||
			stylesheetEntries.length > 0
		) {
			/** @type {Record<string, EntryScriptInfo[]>} */
			(buildInfo.htmlEntryScripts) = {
				script: scriptEntries,
				"script-module": scriptModuleEntries,
				modulepreload: modulePreloadEntries,
				stylesheet: stylesheetEntries
			};
		}

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);
		buildMeta.exportsType = "default";

		state.module.addDependency(new StaticExportsDependency(["default"], true));

		return state;
	}
}

module.exports = HtmlParser;
