# Custom javascript parser

## Source code

```javascript
import { increment as inc } from "./increment";
var a = 1;
inc(a); // 2

// async loading
import("./async-loaded").then(function (asyncLoaded) {
	console.log(asyncLoaded);
});
```

## Parsers

### acorn (default)

```javascript
"use strict";

const acorn = require("acorn");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */
/** @typedef {Set<number>} Semicolons */

/**
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const acornParse = (sourceCode, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];
	/** @type {Semicolons} */
	const semicolons = new Set();

	const ast =
		/** @type {import("estree").Program} */
		(
			acorn.parse(sourceCode, {
				...options,
				onComment: options.comments ? comments : undefined,
				onInsertedSemicolon: options.semicolons
					? // Set semicolons
						/**
						 * @param {number} pos a position of semicolon
						 * @returns {Semicolons} set with semicolon positions
						 */
						(pos) => semicolons.add(pos)
					: undefined
			})
		);

	return { ast, comments, semicolons };
};

module.exports = acornParse;
```

### oxc

Implementation example:

```javascript
"use strict";

const oxc = require("oxc-parser");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */
/** @typedef {Set<number>} Semicolons */

class LocationResolver {
	/**
	 * @param {string} sourceCode source code
	 */
	constructor(sourceCode) {
		const len = sourceCode.length;
		let ls = new Uint32Array(Math.ceil(len / 40) + 10);
		ls[0] = 0;
		let count = 1;

		for (let i = 0; i < len; i++) {
			if (sourceCode.charCodeAt(i) === 10) {
				// '\n'
				if (count >= ls.length) {
					const newLs = new Uint32Array(ls.length * 2);
					newLs.set(ls);
					ls = newLs;
				}
				ls[count++] = i + 1;
			}
		}

		this.lineStarts = ls.subarray(0, count);
		this.lsLen = count;
		/** @type {[number, number, number, number]} */
		this.coords = [0, 0, 0, 0];
	}

	/**
	 * @param {number} start start
	 * @param {number} end end
	 * @returns {[number, number, number, number]} location
	 */
	getLocation(start, end) {
		const ls = this.lineStarts;

		// Search Start
		let sLow = 0;
		let sHigh = this.lsLen - 1;
		while (sLow <= sHigh) {
			const mid = (sLow + sHigh) >>> 1;
			if (ls[mid] <= start) sLow = mid + 1;
			else sHigh = mid - 1;
		}

		// Search End
		let eLow = 0;
		let eHigh = this.lsLen - 1;
		while (eLow <= eHigh) {
			const mid = (eLow + eHigh) >>> 1;
			if (ls[mid] <= end) eLow = mid + 1;
			else eHigh = mid - 1;
		}

		const res = this.coords;
		res[0] = sHigh + 1; // Line
		res[1] = start - ls[sHigh]; // Col
		res[2] = eHigh + 1; // Line
		res[3] = end - ls[eHigh]; // Col

		return res;
	}
}

/**
 * @param {string} sourceCode source code
 * @returns {Semicolons} semicolons
 */
const collectSemicolons = (sourceCode) => {
	const semiSet = new Set();
	let pos = sourceCode.indexOf(";");

	while (pos !== -1) {
		semiSet.add(pos);
		pos = sourceCode.indexOf(";", pos + 1);
	}

	return semiSet;
};

/**
 * @template {Node} T
 * @typedef {T & { start: number, end: number, range: [number, number] }} NodeWithRange
 */

/**
 * @template {Node} T
 * @typedef {T & { start: number, end: number, range: [number, number], loc: SourceLocation }} NodeWithRangeAndLocation
 */

/**
 * @template {Node} T
 * @param {NodeWithRange<T>} node node
 * @param {LocationResolver} locationResolver location resolver
 * @param {WeakMap<NodeWithRange<T>, NodeWithRangeAndLocation<T>>} cache cache
 * @returns {NodeWithRangeAndLocation<T>} proxy node
 */
const createLazyProxy = (node, locationResolver, cache) => {
	if (cache.has(node)) {
		return /** @type {NodeWithRangeAndLocation<T>} */ (cache.get(node));
	}

	const proxy =
		/** @type {NodeWithRangeAndLocation<T>} */
		(
			new Proxy(node, {
				has(target, prop) {
					return prop === "loc" || prop in target;
				},
				get(target, prop, receiver) {
					if (prop === "loc") {
						const loc = locationResolver.getLocation(target.start, target.end);
						return {
							start: {
								line: loc[0],
								offset: loc[1]
							},
							end: {
								line: loc[2],
								offset: loc[3]
							}
						};
					}

					const value = Reflect.get(target, prop, receiver);

					if (Array.isArray(value)) {
						return value.map((node) => {
							if (
								!node ||
								typeof node !== "object" ||
								Array.isArray(node) ||
								!node.type
							) {
								return node;
							}

							return createLazyProxy(node, locationResolver, cache);
						});
					} else if (
						value &&
						typeof value === "object" &&
						/** @type {T} */ (value).type
					) {
						return createLazyProxy(
							/** @type {NodeWithRange<T>} */
							(
								/** @type {unknown} */
								(value)
							),
							locationResolver,
							cache
						);
					}

					return value;
				}
			})
		);

	cache.set(node, proxy);

	return proxy;
};

/**
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const oxcParse = (sourceCode, options) => {
	const locationResolver = new LocationResolver(sourceCode);

	// We need only automatic semicolon insertion position, but there is no API, so let's collect all semicolons
	// But there are rooms to improve it
	/** @type {Semicolons} */
	const semicolons = options.semicolons
		? collectSemicolons(sourceCode)
		: new Set();

	const result = oxc.parseSync("file.js", sourceCode, {
		...options,
		astType: "js",
		range: true,
		sourceType: options.sourceType === "module" ? "module" : "script",
		// @ts-expect-error no types
		experimentalRawTransfer: true
	});

	const comments =
		/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
		(result.comments);

	for (const comment of comments) {
		Object.defineProperty(comment, "loc", {
			get() {
				const loc = locationResolver.getLocation(comment.start, comment.end);
				return {
					start: {
						line: loc[0],
						column: loc[1]
					},
					end: {
						line: loc[2],
						column: loc[3]
					}
				};
			},
			configurable: true,
			enumerable: true
		});
		Object.defineProperty(comment, "range", {
			get() {
				return [comment.start, comment.end];
			},
			configurable: true,
			enumerable: true
		});
	}

	const ast = createLazyProxy(
		/** @type {NodeWithRange<Program>} */
		(result.program),
		locationResolver,
		new WeakMap()
	);
	return { ast, comments, semicolons };
};

module.exports = oxcParse;
```

### meriyah

Implementation example:

```javascript
"use strict";

const meriyah = require("meriyah");

/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */
/** @typedef {Set<number>} Semicolons */

/**
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const meriyahParse = (sourceCode, options) => {
	/** @type {(Comment & { start: number, end: number, loc: SourceLocation })[]} */
	const comments = [];
	/** @type {Semicolons} */
	const semicolons = new Set();

	const ast =
		/** @type {import("estree").Program} */
		(
			meriyah.parse(sourceCode, {
				...options,
				module: options.sourceType === "module",
				loc: options.locations,
				onComment: options.comments
					? (type, value, start, end, loc) => {
							if (type === "SingleLine" || type === "MultiLine") {
								comments.push({
									type: type === "SingleLine" ? "Line" : "Block",
									value,
									start,
									end,
									range: [start, end],
									loc
								});
							}
						}
					: undefined,
				onInsertedSemicolon: options.semicolons
					? // Set semicolons
						/**
						 * @param {number} pos a position of semicolon
						 * @returns {Semicolons} set with semicolon positions
						 */
						(pos) => semicolons.add(pos)
					: undefined
			})
		);

	return { ast, comments, semicolons };
};

module.exports = meriyahParse;
```

## Configuration example

```javascript
"use strict";

const acornParse = require("./internals/acorn-parse.js");
const meriyahParse = require("./internals/meriyah-parse.js");
const oxcParse = require("./internals/oxc-parse.js");

/** @type {import("webpack").Configuration[]} */
const config = [
	// oxc
	{
		entry: "./example.js",
		mode: "production",
		optimization: {
			chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
		},
		output: {
			filename: "oxc.[name].js"
		},
		module: {
			// Global override
			parser: {
				javascript: {
					parse: oxcParse
				}
			}
			// Override on the module level, only for modules which match the `test`
			// rules: [
			// 	{
			// 		test: /\.js$/,
			// 		parser: {
			// 			parse: oxcParse
			// 		}
			// 	}
			// ]
		}
	},
	// meriyah
	{
		entry: "./example.js",
		mode: "production",
		optimization: {
			chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
		},
		output: {
			filename: "meriyah.[name].js"
		},
		module: {
			// Global override
			parser: {
				javascript: {
					parse: meriyahParse
				}
			}
			// Override on the module level, only for modules which match the `test`
			// rules: [
			// 	{
			// 		test: /\.js$/,
			// 		parser: {
			// 			parse: meriyahParse
			// 		}
			// 	}
			// ]
		}
	},
	// acorn
	{
		entry: "./example.js",
		mode: "production",
		output: {
			filename: "acorn.[name].js"
		},
		optimization: {
			chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
		},
		module: {
			// Global override
			parser: {
				javascript: {
					parse: acornParse
				}
			}
			// Override on the module level, only for modules which match the `test`
			// rules: [
			// 	{
			// 		test: /\.js$/,
			// 		parser: {
			// 			parse: acornParse
			// 		}
			// 	}
			// ]
		}
	}
];

module.exports = config;
```

Implementation example:

# Info

## Unoptimized

```
asset oxc.main.js 12.1 KiB [emitted] (name: main)
asset oxc.655.js 761 bytes [emitted]
runtime modules 5.48 KiB 8 modules
cacheable modules 481 bytes
  ./example.js 176 bytes [built] [code generated]
  ./increment.js 86 bytes [built] [code generated]
  ./async-loaded.js 24 bytes [built] [code generated]
  ./math.js 195 bytes [built] [code generated]
webpack X.X.X compiled successfully

asset meriyah.main.js 12.1 KiB [emitted] (name: main)
asset meriyah.655.js 761 bytes [emitted]
runtime modules 5.48 KiB 8 modules
cacheable modules 481 bytes
  ./example.js 176 bytes [built] [code generated]
  ./increment.js 86 bytes [built] [code generated]
  ./async-loaded.js 24 bytes [built] [code generated]
  ./math.js 195 bytes [built] [code generated]
webpack X.X.X compiled successfully

asset acorn.main.js 12.1 KiB [emitted] (name: main)
asset acorn.655.js 761 bytes [emitted]
runtime modules 5.48 KiB 8 modules
cacheable modules 481 bytes
  ./example.js 176 bytes [built] [code generated]
  ./increment.js 86 bytes [built] [code generated]
  ./async-loaded.js 24 bytes [built] [code generated]
  ./math.js 195 bytes [built] [code generated]
webpack X.X.X compiled successfully
```

## Production mode

```
asset oxc.main.js 2.01 KiB [emitted] [minimized] (name: main)
asset oxc.655.js 121 bytes [emitted] [minimized]
runtime modules 5.48 KiB 8 modules
orphan modules 281 bytes [orphan] 2 modules
cacheable modules 481 bytes
  ./example.js + 2 modules 457 bytes [built] [code generated]
  ./async-loaded.js 24 bytes [built] [code generated]
webpack X.X.X compiled successfully

asset meriyah.main.js 2.01 KiB [emitted] [minimized] (name: main)
asset meriyah.655.js 121 bytes [emitted] [minimized]
runtime modules 5.48 KiB 8 modules
orphan modules 281 bytes [orphan] 2 modules
cacheable modules 481 bytes
  ./example.js + 2 modules 457 bytes [built] [code generated]
  ./async-loaded.js 24 bytes [built] [code generated]
webpack X.X.X compiled successfully

asset acorn.main.js 2.01 KiB [emitted] [minimized] (name: main)
asset acorn.655.js 121 bytes [emitted] [minimized]
runtime modules 5.48 KiB 8 modules
orphan modules 281 bytes [orphan] 2 modules
cacheable modules 481 bytes
  ./example.js + 2 modules 457 bytes [built] [code generated]
  ./async-loaded.js 24 bytes [built] [code generated]
webpack X.X.X compiled successfully
```
