/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const truncateArgs = require("../logging/truncateArgs");

/** @typedef {import("../logging/createConsoleLogger").LoggerConsole} LoggerConsole */

/**
 * @param {Object} options options
 * @param {boolean=} options.colors colors
 * @param {boolean=} options.appendOnly append only
 * @param {NodeJS.WritableStream} options.stream stream
 * @returns {LoggerConsole} logger function
 */
module.exports = ({ colors, appendOnly, stream }) => {
	/** @type {string[] | undefined} */
	let currentStatusMessage = undefined;
	let hasStatusMessage = false;
	let currentIndent = "";
	let currentCollapsed = 0;

	/**
	 * @param {string} str string
	 * @param {string} prefix prefix
	 * @param {string} colorPrefix color prefix
	 * @param {string} colorSuffix color suffix
	 * @returns {string} indented string
	 */
	const indent = (str, prefix, colorPrefix, colorSuffix) => {
		if (str === "") return str;
		prefix = currentIndent + prefix;
		if (colors) {
			return (
				prefix +
				colorPrefix +
				str.replace(/\n/g, colorSuffix + "\n" + prefix + colorPrefix) +
				colorSuffix
			);
		} else {
			return prefix + str.replace(/\n/g, "\n" + prefix);
		}
	};

	const clearStatusMessage = () => {
		if (hasStatusMessage) {
			stream.write("\x1b[2K\r");
			hasStatusMessage = false;
		}
	};

	const writeStatusMessage = () => {
		if (!currentStatusMessage) return;
		const l = /** @type {TODO} */ (stream).columns || 40;
		const args = truncateArgs(currentStatusMessage, l - 1);
		const str = args.join(" ");
		const coloredStr = `\u001b[1m${str}\u001b[39m\u001b[22m`;
		stream.write(`\x1b[2K\r${coloredStr}`);
		hasStatusMessage = true;
	};

	/**
	 * @param {string} prefix prefix
	 * @param {string} colorPrefix color prefix
	 * @param {string} colorSuffix color suffix
	 * @returns {(function(...any[]): void)} function to write with colors
	 */
	const writeColored = (prefix, colorPrefix, colorSuffix) => {
		return (...args) => {
			if (currentCollapsed > 0) return;
			clearStatusMessage();
			const str = indent(
				util.format(...args),
				prefix,
				colorPrefix,
				colorSuffix
			);
			stream.write(str + "\n");
			writeStatusMessage();
		};
	};

	const writeGroupMessage = writeColored(
		"<-> ",
		"\u001b[1m\u001b[36m",
		"\u001b[39m\u001b[22m"
	);

	const writeGroupCollapsedMessage = writeColored(
		"<+> ",
		"\u001b[1m\u001b[36m",
		"\u001b[39m\u001b[22m"
	);

	return {
		log: writeColored("    ", "\u001b[1m", "\u001b[22m"),
		debug: writeColored("    ", "", ""),
		trace: writeColored("    ", "", ""),
		info: writeColored("<i> ", "\u001b[1m\u001b[32m", "\u001b[39m\u001b[22m"),
		warn: writeColored("<w> ", "\u001b[1m\u001b[33m", "\u001b[39m\u001b[22m"),
		error: writeColored("<e> ", "\u001b[1m\u001b[31m", "\u001b[39m\u001b[22m"),
		logTime: writeColored(
			"<t> ",
			"\u001b[1m\u001b[35m",
			"\u001b[39m\u001b[22m"
		),
		group: (...args) => {
			writeGroupMessage(...args);
			if (currentCollapsed > 0) {
				currentCollapsed++;
			} else {
				currentIndent += "  ";
			}
		},
		groupCollapsed: (...args) => {
			writeGroupCollapsedMessage(...args);
			currentCollapsed++;
		},
		groupEnd: () => {
			if (currentCollapsed > 0) currentCollapsed--;
			else if (currentIndent.length >= 2)
				currentIndent = currentIndent.slice(0, currentIndent.length - 2);
		},
		profile: console.profile && (name => console.profile(name)),
		profileEnd: console.profileEnd && (name => console.profileEnd(name)),
		clear:
			!appendOnly &&
			console.clear &&
			(() => {
				clearStatusMessage();
				console.clear();
				writeStatusMessage();
			}),
		status: appendOnly
			? writeColored("<s> ", "", "")
			: (name, ...args) => {
					args = args.filter(Boolean);
					if (name === undefined && args.length === 0) {
						clearStatusMessage();
						currentStatusMessage = undefined;
					} else if (
						typeof name === "string" &&
						name.startsWith("[webpack.Progress] ")
					) {
						currentStatusMessage = [name.slice(19), ...args];
						writeStatusMessage();
					} else if (name === "[webpack.Progress]") {
						currentStatusMessage = [...args];
						writeStatusMessage();
					} else {
						currentStatusMessage = [name, ...args];
						writeStatusMessage();
					}
				}
	};
};
