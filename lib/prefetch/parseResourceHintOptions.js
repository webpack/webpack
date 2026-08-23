/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("../util/memoize");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../errors/UnsupportedFeatureWarning")
);

/** @import { DependencyLocation } from "../Dependency" */
/** @import NormalModule from "../NormalModule" */

/**
 * @typedef {object} ResourceHintOptions
 * @property {true=} prefetch
 * @property {true=} preload
 * @property {("high" | "low" | "auto")=} fetchPriority
 * @property {string=} as
 * @property {string=} type
 * @property {string=} media
 */

/**
 * Reads `webpackPrefetch` / `webpackPreload` / `webpackFetchPriority` /
 * `webpackAs` / `webpackType` / `webpackMedia` from a parsed magic-comment
 * options object. Invalid values emit warnings to the given module.
 * @param {Record<string, EXPECTED_ANY> | null | undefined} importOptions parsed comment options
 * @param {NormalModule} module the module to attach warnings to
 * @param {DependencyLocation} loc location for warnings
 * @returns {ResourceHintOptions} parsed hints (empty when no comments matched)
 */
const parseResourceHintOptions = (importOptions, module, loc) => {
	/** @type {ResourceHintOptions} */
	const hints = {};
	if (!importOptions) return hints;

	/**
	 * @param {string} message warning text
	 * @returns {void}
	 */
	const warn = (message) => {
		module.addWarning(new (getUnsupportedFeatureWarning())(message, loc));
	};

	if (importOptions.webpackPrefetch !== undefined) {
		if (importOptions.webpackPrefetch === true) {
			hints.prefetch = true;
		} else {
			warn(
				`\`webpackPrefetch\` expected true, but received: ${importOptions.webpackPrefetch}.`
			);
		}
	}
	if (importOptions.webpackPreload !== undefined) {
		if (importOptions.webpackPreload === true) {
			hints.preload = true;
		} else {
			warn(
				`\`webpackPreload\` expected true, but received: ${importOptions.webpackPreload}.`
			);
		}
	}
	if (importOptions.webpackFetchPriority !== undefined) {
		const fp = importOptions.webpackFetchPriority;
		if (fp === "high" || fp === "low" || fp === "auto") {
			hints.fetchPriority = fp;
		} else {
			warn(
				`\`webpackFetchPriority\` expected "low", "high" or "auto", but received: ${fp}.`
			);
		}
	}
	if (importOptions.webpackAs !== undefined) {
		if (typeof importOptions.webpackAs === "string") {
			hints.as = importOptions.webpackAs;
		} else {
			warn(
				`\`webpackAs\` expected a string, but received: ${importOptions.webpackAs}.`
			);
		}
	}
	if (importOptions.webpackType !== undefined) {
		if (typeof importOptions.webpackType === "string") {
			hints.type = importOptions.webpackType;
		} else {
			warn(
				`\`webpackType\` expected a string, but received: ${importOptions.webpackType}.`
			);
		}
	}
	if (importOptions.webpackMedia !== undefined) {
		if (typeof importOptions.webpackMedia === "string") {
			hints.media = importOptions.webpackMedia;
		} else {
			warn(
				`\`webpackMedia\` expected a string, but received: ${importOptions.webpackMedia}.`
			);
		}
	}

	return hints;
};

/**
 * Maps a request/filename to the value of the `<link>` `as` attribute. Best
 * effort — falls back to `"fetch"` when the type cannot be guessed. Pattern
 * matches against the path part, ignoring any query string suffix.
 * @param {string} request request/filename
 * @returns {string} value for the `as` attribute
 */
const guessAsAttribute = (request) => {
	if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|tiff?)(\?.*)?$/i.test(request)) {
		return "image";
	}
	if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(request)) return "font";
	if (/\.css(\?.*)?$/i.test(request)) return "style";
	if (/\.[cm]?jsx?(\?.*)?$/i.test(request)) return "script";
	if (/\.[cm]?tsx?(\?.*)?$/i.test(request)) return "script";
	if (/\.(mp3|wav|flac|aac|m4a|ogg|oga)(\?.*)?$/i.test(request)) return "audio";
	if (/\.(mp4|webm|mkv|mov|m4v|ogv|avi)(\?.*)?$/i.test(request)) return "video";
	if (/\.vtt(\?.*)?$/i.test(request)) return "track";
	return "fetch";
};

parseResourceHintOptions.guessAsAttribute = guessAsAttribute;

module.exports = parseResourceHintOptions;
