/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Parser = require("../Parser");
const HtmlSourceDependency = require("../dependencies/HtmlSourceDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const ModuleDependencyError = require("../errors/ModuleDependencyError");
const WebpackError = require("../errors/WebpackError");
const LocConverter = require("../util/LocConverter");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

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

/** @typedef {string[]} Attributes */

const ATTRIBUTE_REGEXP_INNER =
	/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

/**
 * @param {string} element element
 * @param {string} name name
 * @returns {string | undefined} attribute value
 */
const getAttributeValue = (element, name) => {
	/** @type {RegExpExecArray | null} */
	let match;

	ATTRIBUTE_REGEXP_INNER.lastIndex = 0;

	while ((match = ATTRIBUTE_REGEXP_INNER.exec(element)) !== null) {
		const parsedName = match[1];
		const parsedValue = match[2] || match[3] || match[4];

		if (parsedName.toLowerCase() === name) {
			return parsedValue;
		}
	}
};

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
			// TODO Do we need to parser it?
			// "msapplication-task",
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
 * @param {string} element element
 * @returns {boolean} true when need to parser, otherwise false
 */
const filterLinkItemprop = (element) => {
	const value = getAttributeValue(element, "itemprop");
	if (!value) return false;
	const attributes = META.get("itemprop");
	if (!attributes) return false;

	return attributes.has(value.trim().toLowerCase());
};

/**
 * @param {string} element element
 * @returns {boolean} true when need to parse, otherwise false
 */
const filterLinkHref = (element) => {
	const rel = getAttributeValue(element, "rel");
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
		"preload"
	];

	return allowedRels.some((value) => usedRels.includes(value));
};

/**
 * @param {string} element element
 * @returns {boolean} true when need to parser, otherwise false
 */
const filterLinkUnion = (element) =>
	filterLinkHref(element) || filterLinkItemprop(element);

/**
 * @param {string} element element
 * @returns {boolean} true when need to parser, otherwise false
 */
const filterMetaContent = (element) => {
	for (const item of META) {
		const [key, allowedNames] = item;
		const name = getAttributeValue(element, key);
		if (!name) continue;

		return allowedNames.has(name.trim().toLowerCase());
	}

	return false;
};

/** @type {Map<string, Map<string, { parse: (input: string) => ParsedSource[] | undefined, filter?: (element: string) => boolean }>>} */
const DEFAULT_SOURCES = new Map([
	[
		"audio",
		new Map([
			[
				"src",
				{
					parse: parseSrc
				}
			]
		])
	],
	[
		"embed",
		new Map([
			[
				"src",
				{
					parse: parseSrc
				}
			]
		])
	],
	[
		"img",
		new Map([
			[
				"src",
				{
					parse: parseSrc
				}
			],
			[
				"srcset",
				{
					parse: parseSrcset
				}
			]
		])
	],
	[
		"input",
		new Map([
			[
				"src",
				{
					parse: parseSrc
				}
			]
		])
	],
	[
		"link",
		new Map([
			[
				"href",
				{
					parse: parseSrc,
					filter: filterLinkUnion
				}
			],
			[
				"imagesrcset",
				{
					parse: parseSrcset,
					filter: filterLinkHref
				}
			]
		])
	],
	[
		"meta",
		new Map([
			[
				"content",
				{
					parse: parseSrc,
					filter: filterMetaContent
				}
			]
		])
	],
	[
		"object",
		new Map([
			[
				"data",
				{
					parse: parseSrc
				}
			]
		])
	],
	[
		"source",
		new Map([
			[
				"src",
				{
					parse: parseSrc
				}
			],
			[
				"srcset",
				{
					parse: parseSrcset
				}
			]
		])
	],
	[
		"track",
		new Map([
			[
				"src",
				{
					parse: parseSrc
				}
			]
		])
	],
	[
		"video",
		new Map([
			[
				"poster",
				{
					parse: parseSrc
				}
			],
			[
				"src",
				{
					parse: parseSrc
				}
			]
		])
	],
	// SVG
	[
		"image",
		new Map([
			[
				"xlink:href",
				{
					parse: parseSrc
				}
			],
			[
				"href",
				{
					parse: parseSrc
				}
			]
		])
	],
	[
		"use",
		new Map([
			[
				"xlink:href",
				{
					parse: parseSrc
				}
			],
			[
				"href",
				{
					parse: parseSrc
				}
			]
		])
	]
]);

const TAG_REGEXP = /<!--[\s\S]*?-->|<(\w+)([^>]*?)(\/?)>/g;
const ATTRIBUTE_REGEXP =
	/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

class HtmlParser extends Parser {
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

		/** @type {RegExpExecArray | null | undefined} */
		let element;

		const module = state.module;

		// TODO implement HTML parser (WASM)
		while ((element = TAG_REGEXP.exec(source)) !== null) {
			const elementName = element[1];

			if (!elementName) continue;

			const sources = DEFAULT_SOURCES.get(elementName.toLowerCase());

			if (!sources) continue;

			const attributes = element[2];

			if (!attributes) continue;

			/** @type {RegExpExecArray | null} */
			let attributeMatch;

			ATTRIBUTE_REGEXP.lastIndex = 0;

			while ((attributeMatch = ATTRIBUTE_REGEXP.exec(attributes)) !== null) {
				const attributeName = attributeMatch[1];
				const source = sources.get(attributeName.toLowerCase());

				if (!source) continue;

				const attributeValue =
					attributeMatch[2] || attributeMatch[3] || attributeMatch[4];

				if (!attributeValue) continue;

				if (typeof source.filter === "function" && !source.filter(element[0])) {
					continue;
				}

				const equalIndex = attributeMatch[0].indexOf("=");
				const valueInMatchIndex = attributeMatch[0].indexOf(
					attributeValue,
					equalIndex
				);
				const attrBlockBase = element.index + 1 + elementName.length;
				const start = attrBlockBase + attributeMatch.index + valueInMatchIndex;
				const end = start + attributeValue.length;

				/** @type {ParsedSource[] | undefined} */
				let parsedAttributeValue;

				try {
					parsedAttributeValue = source.parse(attributeValue);
				} catch (err) {
					const { line: sl, column: sc } = locConverter.get(start);
					const { line: el, column: ec } = locConverter.get(end);

					module.addError(
						new ModuleDependencyError(
							module,
							new WebpackError(
								`Bad value for attribute "${attributeName}" on element "${elementName}": ${
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
					const sourceStart = start + innerStart;
					const sourceEnd = start + innerEnd;
					const dep = new HtmlSourceDependency(value, [sourceStart, sourceEnd]);
					const { line: sl, column: sc } = locConverter.get(sourceStart);
					const { line: el, column: ec } = locConverter.get(sourceEnd);
					dep.setLoc(sl, sc, el, ec);
					module.addDependency(dep);
					module.addCodeGenerationDependency(dep);
				}
			}
		}

		/** @type {BuildInfo} */
		(module.buildInfo).strict = true;

		const buildMeta = /** @type {BuildMeta} */ (state.module.buildMeta);
		buildMeta.exportsType = "default";

		state.module.addDependency(new StaticExportsDependency(["default"], true));

		return state;
	}
}

module.exports = HtmlParser;
