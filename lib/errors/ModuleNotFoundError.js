/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import { DependencyLocation } from "../graph/Dependency" */
/** @import Module from "../module/Module" */

const previouslyPolyfilledBuiltinModules = {
	assert: "assert/",
	buffer: "buffer/",
	console: "console-browserify",
	constants: "constants-browserify",
	crypto: "crypto-browserify",
	domain: "domain-browser",
	events: "events/",
	http: "stream-http",
	https: "https-browserify",
	os: "os-browserify/browser",
	path: "path-browserify",
	punycode: "punycode/",
	process: "process/browser",
	querystring: "querystring-es3",
	stream: "stream-browserify",
	_stream_duplex: "readable-stream/duplex",
	_stream_passthrough: "readable-stream/passthrough",
	_stream_readable: "readable-stream/readable",
	_stream_transform: "readable-stream/transform",
	_stream_writable: "readable-stream/writable",
	string_decoder: "string_decoder/",
	sys: "util/",
	timers: "timers-browserify",
	tty: "tty-browserify",
	url: "url/",
	util: "util/",
	vm: "vm-browserify",
	zlib: "browserify-zlib"
};

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_REGEXP = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/**
 * Escapes control characters other than tab and line feed, so a request in
 * the message can't move the cursor or change the terminal colors.
 * @param {string} str a message
 * @returns {string} the message with control characters as `\xNN`
 */
const escapeControlCharacters = (str) =>
	str.replace(
		CONTROL_CHARACTER_REGEXP,
		(c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`
	);

class ModuleNotFoundError extends WebpackError {
	/**
	 * Creates an instance of ModuleNotFoundError.
	 * @param {Module | null} module module tied to dependency
	 * @param {Error & { details?: string }} err error thrown
	 * @param {DependencyLocation} loc location of dependency
	 */
	constructor(module, err, loc) {
		let message = `Module not found: ${escapeControlCharacters(err.toString())}`;

		// TODO in the next major release: remove
		const match = err.message.match(/Can't resolve '([^']+)'/);
		if (match) {
			const request = match[1];
			const alias = Object.prototype.hasOwnProperty.call(
				previouslyPolyfilledBuiltinModules,
				request
			)
				? previouslyPolyfilledBuiltinModules[
						/** @type {keyof previouslyPolyfilledBuiltinModules} */ (request)
					]
				: undefined;
			if (alias) {
				const pathIndex = alias.indexOf("/");
				const dependency = pathIndex > 0 ? alias.slice(0, pathIndex) : alias;
				message +=
					"\n\n" +
					"BREAKING CHANGE: " +
					"webpack < 5 used to include polyfills for node.js core modules by default.\n" +
					"This is no longer the case. Verify if you need this module and configure a polyfill for it.\n\n";
				message +=
					"If you want to include a polyfill, you need to:\n" +
					`\t- add a fallback 'resolve.fallback: { "${request}": require.resolve("${alias}") }'\n` +
					`\t- install '${dependency}'\n`;
				message +=
					"If you don't want to include a polyfill, you can use an empty module like this:\n" +
					`\tresolve.fallback: { "${request}": false }`;
			}
		}

		super(message);

		/** @type {string} */
		this.name = "ModuleNotFoundError";
		/** @type {string | undefined} */
		this.details =
			typeof err.details === "string"
				? escapeControlCharacters(err.details)
				: err.details;
		/** @type {Module | null} */
		this.module = module;
		this.error = err;
		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

module.exports = ModuleNotFoundError;
