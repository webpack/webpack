/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

// Placeholders embedded into asset `url()` / HTML chunk URLs at code-generation
// time, when the final public path can't be resolved yet, then substituted
// later once the information is available:
// - PUBLIC_PATH_AUTO    — stands in for `output.publicPath: "auto"`; replaced
//   with the per-output-file undo path (relative `../` segments back to the
//   output root) during chunk/asset render.
// - PUBLIC_PATH_FULL_HASH — stands in for `[fullhash]`/`[hash]` in a public
//   path before the compilation hash exists. Form: `<prefix><len>__`, where
//   `<len>` is the requested hash length (`0` means the full hash). Replaced
//   with the real hash (build-time, e.g. CSS `.css` files) or a runtime
//   `__webpack_require__.h()` expression (inlined CSS in JS).
const PUBLIC_PATH_AUTO = "__WEBPACK_CSS_PUBLIC_PATH_AUTO__";
const PUBLIC_PATH_FULL_HASH = "__WEBPACK_CSS_PUBLIC_PATH_FULL_HASH_";

/**
 * Scan `content` for `PUBLIC_PATH_FULL_HASH` placeholders and invoke `onMatch`
 * once per well-formed occurrence. The placeholder spans the half-open range
 * `[start, end)` and encodes the requested hash length (`0` means the full
 * hash). Callers substitute the build-time hash or a runtime expression
 * depending on context.
 * @param {string} content text to scan
 * @param {(start: number, end: number, length: number) => void} onMatch placeholder callback
 * @returns {void}
 */
const walkFullHashPlaceholders = (content, onMatch) => {
	const prefix = PUBLIC_PATH_FULL_HASH;
	const prefixLen = prefix.length;
	const len = content.length;
	let idx = content.indexOf(prefix);
	while (idx !== -1) {
		let digitEnd = idx + prefixLen;
		while (digitEnd < len) {
			const cc = content.charCodeAt(digitEnd);
			if (cc < 48 || cc > 57) break;
			digitEnd++;
		}
		// Well-formed placeholder: at least one digit followed by `__`.
		if (
			digitEnd > idx + prefixLen &&
			digitEnd + 1 < len &&
			content.charCodeAt(digitEnd) === 95 &&
			content.charCodeAt(digitEnd + 1) === 95
		) {
			const length = Number.parseInt(
				content.slice(idx + prefixLen, digitEnd),
				10
			);
			onMatch(idx, digitEnd + 2, length);
			idx = content.indexOf(prefix, digitEnd + 2);
		} else {
			idx = content.indexOf(prefix, idx + prefixLen);
		}
	}
};

module.exports.PUBLIC_PATH_AUTO = PUBLIC_PATH_AUTO;
module.exports.PUBLIC_PATH_FULL_HASH = PUBLIC_PATH_FULL_HASH;
module.exports.walkFullHashPlaceholders = walkFullHashPlaceholders;
