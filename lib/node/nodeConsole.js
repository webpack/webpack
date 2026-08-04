/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const truncateArgs = require("../logging/truncateArgs");
const memoize = require("../util/memoize");

const getCli = memoize(() => require("../cli"));

const ESC = "\u001B[";
const CURSOR_UP = `${ESC}1A`;
const CLEAR_LINE = `${ESC}2K\r`;

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../config/defaults").InfrastructureLoggingNormalizedWithDefaults} InfrastructureLoggingNormalizedWithDefaults */
/** @typedef {import("../logging/createConsoleLogger").LoggerConsole} LoggerConsole */
/**
 * @typedef {object} StatusMessageState
 * @property {string[] | undefined} currentMessage current status message
 * @property {number} currentLines current status message rows
 */

/** @type {WeakMap<Compiler, StatusMessageState>} */
const logStatusStateByCompiler = new WeakMap();
/** @type {Set<StatusMessageState>} */
const logStatusStates = new Set();

/**
 * Returns status state
 * @param {Compiler} compiler compiler
 * @returns {StatusMessageState} status state
 */
const getLogStatusState = (compiler) => {
	let state = logStatusStateByCompiler.get(compiler);
	if (state === undefined) {
		state = {
			currentMessage: undefined,
			currentLines: 0
		};
		logStatusStateByCompiler.set(compiler, state);
		logStatusStates.add(state);
	}
	return state;
};

/* eslint-disable no-console */

/**
 * Returns logger function.
 * @param {object} options options
 * @param {boolean=} options.colors colors
 * @param {boolean=} options.appendOnly append only
 * @param {InfrastructureLoggingNormalizedWithDefaults["stream"]} options.stream stream
 * @param {Compiler} options.compiler compiler
 * @returns {LoggerConsole} logger function
 */
module.exports = ({ colors, appendOnly, stream, compiler }) => {
	const c = getCli().createColors({ useColor: Boolean(colors) });
	const logStatusState = getLogStatusState(compiler);

	let currentIndent = "";
	let currentCollapsed = 0;

	/**
	 * Returns indented string.
	 * @param {string} str string
	 * @param {string} prefix prefix
	 * @param {(line: string) => string} colorFn color function
	 * @returns {string} indented string
	 */
	const indent = (str, prefix, colorFn) => {
		if (str === "") return str;
		prefix = currentIndent + prefix;
		return (
			prefix +
			str
				.split("\n")
				.map((line) => colorFn(line))
				.join(`\n${prefix}`)
		);
	};

	const clearStatusMessage = () => {
		let lines = 0;
		for (const state of logStatusStates) {
			if (state.currentLines) {
				lines += state.currentLines;
				state.currentLines = 0;
			}
		}
		for (let i = 0; i < lines; i++) {
			if (i > 0) stream.write(CURSOR_UP);
			stream.write(CLEAR_LINE);
		}
	};

	const writeStatusMessage = () => {
		const column = stream.columns || 40;
		/** @type {string[]} */
		const all = [];

		for (const state of logStatusStates) {
			if (!state.currentMessage) continue;
			/** @type {string[][]} */
			const lines = [[]];
			for (const item of state.currentMessage) {
				const parts = item.split("\n");
				lines[lines.length - 1].push(parts[0]);
				for (let i = 1; i < parts.length; i++) {
					lines.push([parts[i]]);
				}
			}
			const truncateLines = lines.map((args) =>
				truncateArgs(args, column - 1).join(" ")
			);
			state.currentLines = truncateLines.length;
			for (const line of truncateLines) all.push(line);
		}
		if (all.length === 0) return;

		const coloredLines = all.map((str) => c.bold(str));
		stream.write(`${CLEAR_LINE}${coloredLines.join(`\n${CLEAR_LINE}`)}`);
	};

	/**
	 * @param {EXPECTED_ANY[]} statusMessage status message
	 * @returns {void}
	 */
	const setStatusMessage = (statusMessage) => {
		clearStatusMessage();
		logStatusState.currentMessage = statusMessage.map((item) => `${item}`);
		writeStatusMessage();
	};

	/**
	 * Returns function to write with colors.
	 * @template T
	 * @param {string} prefix prefix
	 * @param {(line: string) => string} colorFn color function
	 * @returns {(...args: T[]) => void} function to write with colors
	 */
	const writeColored =
		(prefix, colorFn) =>
		(...args) => {
			if (currentCollapsed > 0) return;
			clearStatusMessage();
			const str = indent(util.format(...args), prefix, colorFn);
			stream.write(`${str}\n`);
			writeStatusMessage();
		};

	/** @type {<T extends unknown[]>(...args: T) => void} */
	const writeGroupMessage = writeColored("<-> ", (str) => c.bold(c.cyan(str)));

	/** @type {<T extends unknown[]>(...args: T) => void} */
	const writeGroupCollapsedMessage = writeColored("<+> ", (str) =>
		c.bold(c.cyan(str))
	);

	return {
		/** @type {LoggerConsole["log"]} */
		log: writeColored("    ", c.bold),
		/** @type {LoggerConsole["debug"]} */
		debug: writeColored("    ", String),
		/** @type {LoggerConsole["trace"]} */
		trace: writeColored("    ", String),
		/** @type {LoggerConsole["info"]} */
		info: writeColored("<i> ", (str) => c.bold(c.green(str))),
		/** @type {LoggerConsole["warn"]} */
		warn: writeColored("<w> ", (str) => c.bold(c.yellow(str))),
		/** @type {LoggerConsole["error"]} */
		error: writeColored("<e> ", (str) => c.bold(c.red(str))),
		/** @type {LoggerConsole["logTime"]} */
		logTime: writeColored("<t> ", (str) => c.bold(c.magenta(str))),
		/** @type {LoggerConsole["group"]} */
		group: (...args) => {
			writeGroupMessage(...args);
			if (currentCollapsed > 0) {
				currentCollapsed++;
			} else {
				currentIndent += "  ";
			}
		},
		/** @type {LoggerConsole["groupCollapsed"]} */
		groupCollapsed: (...args) => {
			writeGroupCollapsedMessage(...args);
			currentCollapsed++;
		},
		/** @type {LoggerConsole["groupEnd"]} */
		groupEnd: () => {
			if (currentCollapsed > 0) {
				currentCollapsed--;
			} else if (currentIndent.length >= 2) {
				currentIndent = currentIndent.slice(0, -2);
			}
		},
		/** @type {LoggerConsole["profile"]} */
		profile: console.profile && ((name) => console.profile(name)),
		/** @type {LoggerConsole["profileEnd"]} */
		profileEnd: console.profileEnd && ((name) => console.profileEnd(name)),
		/** @type {LoggerConsole["clear"]} */
		clear:
			/** @type {() => void} */
			(
				!appendOnly &&
					console.clear &&
					(() => {
						clearStatusMessage();
						console.clear();
						writeStatusMessage();
					})
			),
		/** @type {LoggerConsole["status"]} */
		status: appendOnly
			? writeColored("<s> ", String)
			: (name, ...args) => {
					args = args.filter(Boolean);
					if (name === undefined && args.length === 0) {
						clearStatusMessage();
						logStatusState.currentMessage = undefined;
					} else if (
						typeof name === "string" &&
						name.startsWith("[webpack.Progress] ")
					) {
						setStatusMessage([name.slice(19), ...args]);
					} else if (name === "[webpack.Progress]") {
						setStatusMessage([...args]);
					} else {
						setStatusMessage([name, ...args]);
					}
				}
	};
};
