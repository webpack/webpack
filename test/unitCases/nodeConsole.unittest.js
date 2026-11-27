"use strict";

const { Writable } = require("stream");
const Compiler = require("../../lib/Compiler");
const {
	getNormalizedWebpackOptions
} = require("../../lib/config/normalization");
const nodeConsole = require("../../lib/node/nodeConsole");

/** @typedef {import("../../lib/logging/createConsoleLogger").LoggerConsole} LoggerConsole */

const CLEAR_LINE = "\u001B[2K\r";

/**
 * A console writing to a stream that keeps what it is given.
 * @param {boolean=} appendOnly whether status lines are appended, not redrawn
 * @returns {{ console: LoggerConsole, written: () => string }} the console and what it wrote
 */
const consoleOnStream = (appendOnly = false) => {
	let out = "";
	const stream = Object.assign(
		new Writable({
			decodeStrings: false,
			write(chunk, _encoding, callback) {
				out += chunk;
				callback();
			}
		}),
		{ columns: 80 }
	);
	return {
		console: nodeConsole({
			colors: false,
			appendOnly,
			stream,
			compiler: new Compiler(__dirname, getNormalizedWebpackOptions({}))
		}),
		written: () => out
	};
};

describe("nodeConsole", () => {
	/** @type {LoggerConsole[]} */
	const consoles = [];

	/**
	 * @param {boolean=} appendOnly whether status lines are appended
	 * @returns {ReturnType<typeof consoleOnStream>} a console, cleared after the test
	 */
	const open = (appendOnly) => {
		const opened = consoleOnStream(appendOnly);
		consoles.push(opened.console);
		return opened;
	};

	afterEach(() => {
		// Status lines are kept per process, so each test clears its own.
		for (const opened of consoles.splice(0)) {
			/** @type {NonNullable<LoggerConsole["status"]>} */ (opened.status)();
		}
	});

	it("writes a progress status without its label", () => {
		const { console, written } = open();
		/** @type {NonNullable<LoggerConsole["status"]>} */ (console.status)(
			"[webpack.Progress] 50%",
			"building",
			"modules"
		);
		expect(written()).toBe(`${CLEAR_LINE}50% building modules`);
	});

	it("leaves out a status's empty arguments", () => {
		const { console, written } = open();
		/** @type {NonNullable<LoggerConsole["status"]>} */ (console.status)(
			"[webpack.Progress]",
			"10%",
			"",
			undefined,
			"setup"
		);
		expect(written()).toBe(`${CLEAR_LINE}10% setup`);
	});

	it("keeps another logger's label and writes a number as text", () => {
		const { console, written } = open();
		/** @type {NonNullable<LoggerConsole["status"]>} */ (console.status)(
			"[MyPlugin] working",
			3
		);
		expect(written()).toBe(`${CLEAR_LINE}[MyPlugin] working 3`);
	});

	it("writes each line of a status on its own line", () => {
		const { console, written } = open();
		/** @type {NonNullable<LoggerConsole["status"]>} */ (console.status)(
			"[webpack.Progress] 50%",
			"a\nb"
		);
		expect(written()).toBe(`${CLEAR_LINE}50% a\n${CLEAR_LINE}b`);
	});

	it("clears the status line with a status of no arguments", () => {
		const { console, written } = open();
		const status = /** @type {NonNullable<LoggerConsole["status"]>} */ (
			console.status
		);
		status("[MyPlugin] working");
		const before = written().length;
		status();
		expect(written().slice(before)).toBe(CLEAR_LINE);
	});

	it("appends a status as a marked line when append-only", () => {
		const { console, written } = open(true);
		/** @type {NonNullable<LoggerConsole["status"]>} */ (console.status)(
			"[MyPlugin] working",
			3
		);
		expect(written()).toBe("<s> [MyPlugin] working 3\n");
	});
});
