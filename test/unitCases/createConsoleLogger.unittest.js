"use strict";

const { LogType } = require("../../lib/logging/Logger");
const createConsoleLogger = require("../../lib/logging/createConsoleLogger");

/** @typedef {import("../../lib/logging/createConsoleLogger").LoggerConsole} LoggerConsole */
/** @typedef {import("../../lib/logging/Logger").Args} Args */

/**
 * A console that records every call, under the method's name.
 * @param {(keyof LoggerConsole)[]=} without methods it leaves out, as an older console does
 * @returns {{ console: LoggerConsole, calls: [string, Args][] }} the console and its calls
 */
const recordingConsole = (without = []) => {
	/** @type {[string, Args][]} */
	const calls = [];
	/**
	 * @param {string} name the method's name
	 * @returns {(...args: Args) => void} the method
	 */
	const record =
		(name) =>
		(...args) => {
			calls.push([name, args]);
		};
	/** @type {Record<string, (...args: Args) => void>} */
	const methods = {};
	for (const name of [
		"clear",
		"trace",
		"info",
		"log",
		"warn",
		"error",
		"debug",
		"group",
		"groupCollapsed",
		"groupEnd",
		"status",
		"profile",
		"profileEnd",
		"logTime"
	]) {
		if (!without.includes(/** @type {keyof LoggerConsole} */ (name))) {
			methods[name] = record(name);
		}
	}
	return { console: /** @type {LoggerConsole} */ (methods), calls };
};

describe("createConsoleLogger", () => {
	it("labels a message with the logger's name", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({ level: "log", debug: false, console });
		logger("webpack.Compiler", LogType.info, ["built %d modules", 3]);
		expect(calls).toEqual([
			["info", ["[webpack.Compiler] built %d modules", 3]]
		]);
	});

	it("puts the label first when the message is not a string", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({ level: "log", debug: false, console });
		const value = { modules: 3 };
		logger("webpack.Compiler", LogType.log, [value, "after"]);
		expect(calls).toEqual([["log", ["[webpack.Compiler]", value, "after"]]]);
		expect(calls[0][1][1]).toBe(value);
	});

	it("labels an entry without arguments by the name alone", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({ level: "log", debug: false, console });
		logger("webpack.Compiler", LogType.group, []);
		logger("webpack.Compiler", LogType.groupEnd, []);
		expect(calls).toEqual([
			["group", ["[webpack.Compiler]"]],
			["groupEnd", []]
		]);
	});

	it("leaves out what the level is below", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({
			level: "warn",
			debug: false,
			console
		});
		logger("a", LogType.log, ["log"]);
		logger("a", LogType.info, ["info"]);
		logger("a", LogType.warn, ["warn"]);
		logger("a", LogType.error, ["error"]);
		expect(calls.map(([name]) => name)).toEqual(["warn", "error"]);
	});

	it("logs everything for a logger its debug filter names", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({
			level: "none",
			debug: [/MyPlugin/],
			console
		});
		logger("MyPlugin", LogType.debug, ["shown"]);
		logger("OtherPlugin", LogType.debug, ["hidden"]);
		logger("OtherPlugin", LogType.error, ["hidden too"]);
		expect(calls).toEqual([["debug", ["[MyPlugin] shown"]]]);
	});

	it("writes a time as milliseconds", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({ level: "log", debug: false, console });
		logger("a", LogType.time, ["build", 1, 500000]);
		expect(calls).toEqual([["logTime", ["[a] build: 1000.5 ms"]]]);
	});

	it("falls back to `log` and `info` on a console without the method", () => {
		const { console, calls } = recordingConsole([
			"debug",
			"group",
			"logTime",
			"status"
		]);
		const logger = createConsoleLogger({ level: "log", debug: true, console });
		logger("a", LogType.debug, ["debug"]);
		logger("a", LogType.group, ["group"]);
		logger("a", LogType.time, ["build", 0, 2000000]);
		logger("a", LogType.status, ["working"]);
		logger("a", LogType.status, []);
		expect(calls).toEqual([
			["log", ["[a] debug"]],
			["log", ["[a] group"]],
			["log", ["[a] build: 2 ms"]],
			["info", ["[a] working"]]
		]);
	});

	it("clears the status line with a status of no arguments", () => {
		const { console, calls } = recordingConsole();
		const logger = createConsoleLogger({
			level: "info",
			debug: false,
			console
		});
		logger("a", LogType.status, ["working", 50]);
		logger("a", LogType.status, []);
		expect(calls).toEqual([
			["status", ["[a] working", 50]],
			["status", []]
		]);
	});

	it("refuses an unknown entry type", () => {
		const { console } = recordingConsole();
		const logger = createConsoleLogger({ level: "log", debug: false, console });
		expect(() =>
			logger(
				"a",
				/** @type {import("../../lib/logging/Logger").LogTypeEnum} */ (
					/** @type {string} */ ("nope")
				)
			)
		).toThrow("Unexpected LogType nope");
	});
});
