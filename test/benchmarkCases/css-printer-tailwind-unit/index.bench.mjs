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
// (emitted so that it can be taken back, and taken back), and an opener held
// back so an empty block can still be dropped.
//
// Every fixture runs twice: `walk` is what a build that is not minimizing pays
// — parse and walk, no output — and `minify` is the same pass with the printer
// on. No visitors are registered, so `walk` is the floor both share and the
// difference is what printing and the map cost on that shape, which neither
// number shows alone. Visitor cost itself is `css-parser-tailwind-unit`'s.

// Real-world ~1.9 MiB minified stylesheet (Tailwind), shared with the
// `css/large` configCase and the parser benchmark.
const TAILWIND = fs.readFileSync(
	fileURLToPath(
		new URL("../../configCases/css/large/tailwind.min.css", import.meta.url)
	),
	"utf8"
);

/** @type {[string, string][]} name, source */
const FIXTURES = [
	["tailwind", TAILWIND],
	// One block big enough to stream, and many that are not: the same rules
	// either way, so the pair isolates what streaming a block costs against
	// buffering it.
	[
		"streamed block",
		(() => {
			let s = "@media (min-width:1px){";
			for (let i = 0; i < 5000; i++) {
				s += `.n-${i}{color:#0000ff;margin:1px 2px 3px 4px;padding:0}`;
			}
			return `${s}}`;
		})()
	],
	[
		"buffered blocks",
		(() => {
			let s = "";
			for (let i = 0; i < 200; i++) {
				s += `@media (min-width:${i}px){`;
				for (let j = 0; j < 25; j++) {
					s += `.b-${i}-${j}{color:#0000ff;margin:1px 2px 3px 4px;padding:0}`;
				}
				s += "}";
			}
			return s;
		})()
	],
	// One long run of top-level rules — no block frame at all, so this is the
	// per-rule cost on its own.
	[
		"flat rules",
		(() => {
			let s = "";
			for (let i = 0; i < 6000; i++) {
				s += `.f-${i}{color:#0000ff;margin:1px 2px 3px 4px;padding:0}`;
			}
			return s;
		})()
	],
	// Eight-deep at-rule nesting: one frame per open block, so depth is the axis
	// `flat rules` holds flat.
	[
		"deep nesting",
		(() => {
			let s = "";
			for (let i = 0; i < 400; i++) {
				for (let j = 0; j < 8; j++) s += `@media (min-width:${j}px){`;
				s += `.d-${i}{color:red}`;
				s += "}".repeat(8);
			}
			return s;
		})()
	],
	// CSS nesting: declarations interleaved with nested rules inside one streamed
	// block, so each declaration is emitted so that it can be taken back, and is
	// when a later one overrides it.
	[
		"retracted declarations",
		(() => {
			let s = ".outer{";
			for (let i = 0; i < 4000; i++) {
				s += `color:rgb(${i % 256} 0 0);.n-${i}{margin:1px 2px 3px 4px;padding:0}`;
			}
			return `${s}}`;
		})()
	],
	// Every rule prints to nothing, so a streamed block's held-back opener is
	// dropped rather than flushed — the whole stylesheet serializes to "".
	[
		"dropped empty blocks",
		(() => {
			let s = "@media (min-width:1px){";
			for (let i = 0; i < 20000; i++) s += `.e-${i}{}`;
			return `${s}}`;
		})()
	]
];

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	for (const [name, source] of FIXTURES) {
		bench.add(
			`unit benchmark "css-printer-tailwind-unit", walk (${name})`,
			() => {
				new SourceProcessor().process(source);
			}
		);
		bench.add(
			`unit benchmark "css-printer-tailwind-unit", minify (${name})`,
			() => {
				new SourceProcessor().process(source, {
					minimize: true,
					source: "in.css"
				});
			}
		);
	}
};
