// cspell:ignore tailwind rgba
import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/css/syntax")} */
const cssSyntax = require("../../../lib/css/syntax.js");

const { SourceProcessor } = cssSyntax;

// Printing is the other half of `css-parser-tailwind-unit`: the same walk, but
// every node also serializes and the input->output source map is resolved.
// A nested block that grows past the streaming threshold hands its children back
// as they finish and prints them into the output there; one that stays small is
// materialized and printed whole. Both paths are covered here, along with the
// pieces only a streamed block reaches — a declaration a later one overrides
// (retracted rather than re-emitted) and an opener held back so an empty block
// can still be dropped.

// Real-world ~1.9 MiB minified stylesheet (Tailwind), shared with the
// `css/large` configCase and the parser benchmark.
const TAILWIND = fs.readFileSync(
	fileURLToPath(
		new URL("../../configCases/css/large/tailwind.min.css", import.meta.url)
	),
	"utf8"
);

// One block big enough to stream, and many that are not: the same rules either
// way, so the pair isolates what streaming a block costs against buffering it.
const STREAMED_BLOCK = (() => {
	let s = "@media (min-width:1px){";
	for (let i = 0; i < 5000; i++) {
		s += `.n-${i}{color:#0000ff;margin:1px 2px 3px 4px;padding:0}`;
	}
	return `${s}}`;
})();
const BUFFERED_BLOCKS = (() => {
	let s = "";
	for (let i = 0; i < 200; i++) {
		s += `@media (min-width:${i}px){`;
		for (let j = 0; j < 25; j++) {
			s += `.b-${i}-${j}{color:#0000ff;margin:1px 2px 3px 4px;padding:0}`;
		}
		s += "}";
	}
	return s;
})();

// One long run of top-level rules — no block frame at all, so this is the
// per-rule cost on its own.
const FLAT = (() => {
	let s = "";
	for (let i = 0; i < 6000; i++) {
		s += `.f-${i}{color:#0000ff;margin:1px 2px 3px 4px;padding:0}`;
	}
	return s;
})();

// Eight-deep at-rule nesting: one frame per open block, so depth is the axis
// `FLAT` holds flat.
const DEEP = (() => {
	let s = "";
	for (let i = 0; i < 400; i++) {
		for (let j = 0; j < 8; j++) s += `@media (min-width:${j}px){`;
		s += `.d-${i}{color:red}`;
		s += "}".repeat(8);
	}
	return s;
})();

// CSS nesting: declarations interleaved with nested rules inside one streamed
// block, so each declaration is emitted so that it can be taken back, and is
// when a later one overrides it.
const NESTED_DECLARATIONS = (() => {
	let s = ".outer{";
	for (let i = 0; i < 4000; i++) {
		s += `color:rgb(${i % 256} 0 0);.n-${i}{margin:1px 2px 3px 4px;padding:0}`;
	}
	return `${s}}`;
})();

// Every rule prints to nothing, so a streamed block's held-back opener is
// dropped rather than flushed — the whole stylesheet serializes to "".
const DROPPED = (() => {
	let s = "@media (min-width:1px){";
	for (let i = 0; i < 20000; i++) s += `.e-${i}{}`;
	return `${s}}`;
})();

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// Whole-stylesheet minify — the entry `cssMinify` drives.
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (tailwind)',
		() => {
			new SourceProcessor().process(TAILWIND, {
				minimize: true,
				source: "tailwind.min.css"
			});
		}
	);

	// The two paths a nested block can take.
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (streamed block)',
		() => {
			new SourceProcessor().process(STREAMED_BLOCK, {
				minimize: true,
				source: "in.css"
			});
		}
	);
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (buffered blocks)',
		() => {
			new SourceProcessor().process(BUFFERED_BLOCKS, {
				minimize: true,
				source: "in.css"
			});
		}
	);

	// Stylesheet shapes: flat and deep.
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (flat rules)',
		() => {
			new SourceProcessor().process(FLAT, {
				minimize: true,
				source: "in.css"
			});
		}
	);
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (deep nesting)',
		() => {
			new SourceProcessor().process(DEEP, {
				minimize: true,
				source: "in.css"
			});
		}
	);

	// What only a streamed block reaches.
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (retracted declarations)',
		() => {
			new SourceProcessor().process(NESTED_DECLARATIONS, {
				minimize: true,
				source: "in.css"
			});
		}
	);
	bench.add(
		'unit benchmark "css-printer-tailwind-unit", minify (dropped empty blocks)',
		() => {
			new SourceProcessor().process(DROPPED, {
				minimize: true,
				source: "in.css"
			});
		}
	);
};
