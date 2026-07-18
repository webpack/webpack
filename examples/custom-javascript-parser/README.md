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
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */

/**
 * Oxc has no location or `onInsertedSemicolon` APIs — none are needed:
 * webpack derives line/column locations and inserted semicolons from node
 * offsets and the source text itself.
 * @param {string} sourceCode the source code
 * @param {ParseOptions} options options
 * @returns {ParseResult} the parsed result
 */
const oxcParse = (sourceCode, options) => {
	const result = oxc.parseSync("file.js", sourceCode, {
		astType: "js",
		range: true,
		sourceType: options.sourceType === "module" ? "module" : "script",
		// @ts-expect-error no types
		experimentalRawTransfer: true
	});

	const comments =
		/** @type {(Comment & { start: number, end: number })[]} */
		(result.comments);

	// webpack's magic-comment lookup reads `comment.range`
	for (const comment of comments) {
		if (!comment.range) comment.range = [comment.start, comment.end];
	}

	return {
		ast: /** @type {Program} */ (/** @type {unknown} */ (result.program)),
		comments
	};
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
asset output.js 12.4 KiB [emitted] (name: main)
asset 655.output.js 761 bytes [emitted]
chunk (runtime: main) 655.output.js 24 bytes [rendered]
  > ./async-loaded ./example.js 6:0-24
  ./async-loaded.js 24 bytes [built] [code generated]
    [exports: answer]
    [used exports unknown]
    import() ./async-loaded ./example.js 6:0-24
chunk (runtime: main) output.js (main) 457 bytes (javascript) 5.93 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.93 KiB 8 modules
  dependent modules 281 bytes [dependent] 2 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully

asset output.js 12.4 KiB [emitted] (name: main)
asset 655.output.js 761 bytes [emitted]
chunk (runtime: main) 655.output.js 24 bytes [rendered]
  > ./async-loaded ./example.js 6:0-24
  ./async-loaded.js 24 bytes [built] [code generated]
    [exports: answer]
    [used exports unknown]
    import() ./async-loaded ./example.js 6:0-24
chunk (runtime: main) output.js (main) 457 bytes (javascript) 5.93 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.93 KiB 8 modules
  dependent modules 281 bytes [dependent] 2 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully

asset output.js 12.4 KiB [compared for emit] (name: main)
asset 655.output.js 761 bytes [compared for emit]
chunk (runtime: main) 655.output.js 24 bytes [rendered]
  > ./async-loaded ./example.js 6:0-24
  ./async-loaded.js 24 bytes [built] [code generated]
    [exports: answer]
    [used exports unknown]
    import() ./async-loaded ./example.js 6:0-24
chunk (runtime: main) output.js (main) 457 bytes (javascript) 5.93 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.93 KiB 8 modules
  dependent modules 281 bytes [dependent] 2 modules
  ./example.js 176 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 2.24 KiB [emitted] [minimized] (name: main)
asset 655.output.js 121 bytes [emitted] [minimized]
chunk (runtime: main) 655.output.js 24 bytes [rendered]
  > ./async-loaded ./example.js 6:0-24
  ./async-loaded.js 24 bytes [built] [code generated]
    [exports: answer]
    import() ./async-loaded ./example.js + 2 modules ./example.js 6:0-24
chunk (runtime: main) output.js (main) 457 bytes (javascript) 5.93 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.93 KiB 8 modules
  ./example.js + 2 modules 457 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully

asset output.js 2.24 KiB [compared for emit] [minimized] (name: main)
asset 655.output.js 121 bytes [compared for emit] [minimized]
chunk (runtime: main) 655.output.js 24 bytes [rendered]
  > ./async-loaded ./example.js 6:0-24
  ./async-loaded.js 24 bytes [built] [code generated]
    [exports: answer]
    import() ./async-loaded ./example.js + 2 modules ./example.js 6:0-24
chunk (runtime: main) output.js (main) 457 bytes (javascript) 5.93 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.93 KiB 8 modules
  ./example.js + 2 modules 457 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully

asset output.js 2.24 KiB [emitted] [minimized] (name: main)
asset 655.output.js 121 bytes [emitted] [minimized]
chunk (runtime: main) 655.output.js 24 bytes [rendered]
  > ./async-loaded ./example.js 6:0-24
  ./async-loaded.js 24 bytes [built] [code generated]
    [exports: answer]
    import() ./async-loaded ./example.js + 2 modules ./example.js 6:0-24
chunk (runtime: main) output.js (main) 457 bytes (javascript) 5.93 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.93 KiB 8 modules
  ./example.js + 2 modules 457 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
