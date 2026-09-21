/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const tty = require("tty");

/**
 * Checks whether this object is color supported.
 * @returns {boolean} true when colors supported, otherwise false
 */
const isColorSupported = () => {
	const { env = {}, argv = [], platform = "" } = process;

	// Read values instead of using `in`: Deno's and Bun's `process.env` honor
	// property access but not the `in`/`has` trap, so `"X" in env` is unreliable.
	const isDisabled = env.NO_COLOR !== undefined || argv.includes("--no-color");
	const isForced = env.FORCE_COLOR !== undefined || argv.includes("--color");
	const isWindows = platform === "win32";
	const isDumbTerminal = env.TERM === "dumb";

	const isCompatibleTerminal = tty.isatty(1) && env.TERM && !isDumbTerminal;

	const isCI =
		env.CI !== undefined &&
		(env.GITHUB_ACTIONS !== undefined ||
			env.GITLAB_CI !== undefined ||
			env.CIRCLECI !== undefined);

	return (
		!isDisabled &&
		(isForced || (isWindows && !isDumbTerminal) || isCompatibleTerminal || isCI)
	);
};

/**
 * Returns result.
 * @param {number} index index
 * @param {string} string string
 * @param {string} close close
 * @param {string=} replace replace
 * @param {string=} head head
 * @param {string=} tail tail
 * @param {number=} next next
 * @returns {string} result
 */
const replaceClose = (
	index,
	string,
	close,
	replace,
	head = string.slice(0, Math.max(0, index)) + replace,
	tail = string.slice(Math.max(0, index + close.length)),
	next = tail.indexOf(close)
) => head + (next < 0 ? tail : replaceClose(next, tail, close, replace));

/**
 * Returns result.
 * @param {number} index index to replace
 * @param {string} string string
 * @param {string} open open string
 * @param {string} close close string
 * @param {string=} replace extra replace
 * @returns {string} result
 */
const clearBleed = (index, string, open, close, replace) =>
	index < 0
		? open + string + close
		: open + replaceClose(index, string, close, replace) + close;

/** @typedef {(value: EXPECTED_ANY) => string} PrintFunction */

/**
 * Returns function to create color.
 * @param {string} open open string
 * @param {string} close close string
 * @param {string=} replace extra replace
 * @param {number=} at at
 * @returns {PrintFunction} function to create color
 */
const filterEmpty =
	(open, close, replace = open, at = open.length + 1) =>
	(string) =>
		string || !(string === "" || string === undefined)
			? clearBleed(`${string}`.indexOf(close, at), string, open, close, replace)
			: "";

/**
 * Returns result.
 * @param {number} open open code
 * @param {number} close close code
 * @param {string=} replace extra replace
 * @returns {PrintFunction} result
 */
const init = (open, close, replace) =>
	filterEmpty(`\u001B[${open}m`, `\u001B[${close}m`, replace);

/**
 * Defines the colors type used by this module.
 * @typedef {{ reset: PrintFunction, bold: PrintFunction, dim: PrintFunction, italic: PrintFunction, underline: PrintFunction, inverse: PrintFunction, hidden: PrintFunction, strikethrough: PrintFunction, black: PrintFunction, red: PrintFunction, green: PrintFunction, yellow: PrintFunction, blue: PrintFunction, magenta: PrintFunction, cyan: PrintFunction, white: PrintFunction, gray: PrintFunction, bgBlack: PrintFunction, bgRed: PrintFunction, bgGreen: PrintFunction, bgYellow: PrintFunction, bgBlue: PrintFunction, bgMagenta: PrintFunction, bgCyan: PrintFunction, bgWhite: PrintFunction, blackBright: PrintFunction, redBright: PrintFunction, greenBright: PrintFunction, yellowBright: PrintFunction, blueBright: PrintFunction, magentaBright: PrintFunction, cyanBright: PrintFunction, whiteBright: PrintFunction, bgBlackBright: PrintFunction, bgRedBright: PrintFunction, bgGreenBright: PrintFunction, bgYellowBright: PrintFunction, bgBlueBright: PrintFunction, bgMagentaBright: PrintFunction, bgCyanBright: PrintFunction, bgWhiteBright: PrintFunction }} Colors
 */

/**
 * Defines the colors options type used by this module.
 * @typedef {object} ColorsOptions
 * @property {boolean=} useColor force use colors
 */

/**
 * Creates a colors from the provided colors option.
 * @param {ColorsOptions=} options options
 * @returns {Colors} colors
 */
const createColors = ({ useColor = isColorSupported() } = {}) => ({
	reset: useColor ? init(0, 0) : String,
	bold: useColor ? init(1, 22, "\u001B[22m\u001B[1m") : String,
	dim: useColor ? init(2, 22, "\u001B[22m\u001B[2m") : String,
	italic: useColor ? init(3, 23) : String,
	underline: useColor ? init(4, 24) : String,
	inverse: useColor ? init(7, 27) : String,
	hidden: useColor ? init(8, 28) : String,
	strikethrough: useColor ? init(9, 29) : String,
	black: useColor ? init(30, 39) : String,
	red: useColor ? init(31, 39) : String,
	green: useColor ? init(32, 39) : String,
	yellow: useColor ? init(33, 39) : String,
	blue: useColor ? init(34, 39) : String,
	magenta: useColor ? init(35, 39) : String,
	cyan: useColor ? init(36, 39) : String,
	white: useColor ? init(37, 39) : String,
	gray: useColor ? init(90, 39) : String,
	bgBlack: useColor ? init(40, 49) : String,
	bgRed: useColor ? init(41, 49) : String,
	bgGreen: useColor ? init(42, 49) : String,
	bgYellow: useColor ? init(43, 49) : String,
	bgBlue: useColor ? init(44, 49) : String,
	bgMagenta: useColor ? init(45, 49) : String,
	bgCyan: useColor ? init(46, 49) : String,
	bgWhite: useColor ? init(47, 49) : String,
	blackBright: useColor ? init(90, 39) : String,
	redBright: useColor ? init(91, 39) : String,
	greenBright: useColor ? init(92, 39) : String,
	yellowBright: useColor ? init(93, 39) : String,
	blueBright: useColor ? init(94, 39) : String,
	magentaBright: useColor ? init(95, 39) : String,
	cyanBright: useColor ? init(96, 39) : String,
	whiteBright: useColor ? init(97, 39) : String,
	bgBlackBright: useColor ? init(100, 49) : String,
	bgRedBright: useColor ? init(101, 49) : String,
	bgGreenBright: useColor ? init(102, 49) : String,
	bgYellowBright: useColor ? init(103, 49) : String,
	bgBlueBright: useColor ? init(104, 49) : String,
	bgMagentaBright: useColor ? init(105, 49) : String,
	bgCyanBright: useColor ? init(106, 49) : String,
	bgWhiteBright: useColor ? init(107, 49) : String
});

module.exports.createColors = createColors;
module.exports.isColorSupported = isColorSupported;
