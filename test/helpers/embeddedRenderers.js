"use strict";

/** @typedef {import("../../lib/html/syntax-parser").EmbeddedSourceRenderer} EmbeddedSourceRenderer */
/** @typedef {import("../../lib/html/builtinEmbeddedRenderer").BuiltinEmbeddedRendererOptions} BuiltinEmbeddedRendererOptions */

/**
 * A renderer a fixture's `options.json` names, since JSON holds no function.
 * @typedef {object} NamedRenderer
 * @property {(options: BuiltinEmbeddedRendererOptions, log: string[]) => EmbeddedSourceRenderer} make builds it from the JSON options the name came with, writing what it is offered to `log` where it records
 * @property {boolean=} records whether the print's snapshot also holds `log`
 */

/**
 * The renderers the HTML, XML and CSS printer tests pass, by the name
 * `"renderEmbeddedSource"` gives in an `options.json` print set.
 * @type {Record<string, NamedRenderer>}
 */
const RENDERERS = {
	// webpack's own: its CSS minifier, JSON whitespace and, with `svg`, SVG.
	builtin: {
		make: (options) =>
			require("../../lib/html/builtinEmbeddedRenderer").builtinEmbeddedRenderer(
				options
			)
	},
	// Declines every body, so each is printed as written.
	decline: { make: () => () => undefined },
	// Answers every body with itself, unchanged.
	"as-written": { make: () => (source) => source },
	// Answers every body with nothing.
	empty: { make: () => () => "" },
	// Declines every body and records each offer's type, `as` and source.
	offers: {
		make: (options, log) => (source, info) => {
			log.push(
				`${info.type}${info.as === undefined ? "" : `/${info.as}`}:${JSON.stringify(source)}`
			);
			return undefined;
		},
		records: true
	}
};

/**
 * @param {string | { name: string, options?: BuiltinEmbeddedRendererOptions }} given a renderer's name, or its name with its options
 * @param {string[]} log where a recording renderer writes its offers
 * @returns {{ render: EmbeddedSourceRenderer, records: boolean }} the renderer, and whether its log is snapshotted
 */
const namedRenderer = (given, log) => {
	const { name, options = {} } =
		typeof given === "string" ? { name: given } : given;
	if (!Object.prototype.hasOwnProperty.call(RENDERERS, name)) {
		throw new Error(
			`unknown renderEmbeddedSource "${name}", not one of ${Object.keys(RENDERERS).join(", ")}`
		);
	}
	const { make, records = false } = RENDERERS[name];
	return { render: make(options, log), records };
};

module.exports = { RENDERERS, namedRenderer };
