"use strict";

/** @typedef {import("../../lib/html/syntax-parser").EmbeddedSourceRenderer} EmbeddedSourceRenderer */
/** @typedef {import("../../lib/html/builtinEmbeddedRenderer").BuiltinEmbeddedRendererOptions} BuiltinEmbeddedRendererOptions */

/** @typedef {import("../../lib/html/htmlMinify").AsyncEmbeddedSourceRenderer} AsyncEmbeddedSourceRenderer */

/**
 * A renderer a fixture's `options.json` names, since JSON holds no function.
 * @typedef {object} NamedRenderer
 * @property {(options: EXPECTED_ANY, log: string[]) => EmbeddedSourceRenderer} make builds it from the JSON options the name came with, writing what it is offered to `log` where it records
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
	// Answers what `options` gives for an offer's `type/as` or else its
	// `type`, a string or `{ code, warnings }`, and declines the rest.
	answers: {
		make: (options) => (source, info) => {
			const key = `${info.type}/${info.as}`;
			return Object.prototype.hasOwnProperty.call(options, key)
				? options[key]
				: options[info.type];
		}
	},
	// Throws on every body offered, as a failing minifier does.
	throws: {
		make: () => () => {
			throw new Error("renderer throws");
		}
	},
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

/** @type {Set<string>} */
const SPEC_KEYS = new Set(["name", "options", "async"]);

/**
 * @param {string | { name: string, options?: BuiltinEmbeddedRendererOptions, async?: boolean }} given a renderer's name, or its name with its options and, under `async`, its answer wrapped in a Promise
 * @param {string[]} log where a recording renderer writes its offers
 * @returns {{ render: AsyncEmbeddedSourceRenderer, records: boolean }} the renderer, and whether its log is snapshotted
 */
const namedRenderer = (given, log) => {
	const spec = typeof given === "string" ? { name: given } : given;
	for (const key of Object.keys(spec)) {
		if (!SPEC_KEYS.has(key)) {
			throw new Error(`unknown renderEmbeddedSource key "${key}"`);
		}
	}
	const { name, options = {} } = spec;
	if (!Object.prototype.hasOwnProperty.call(RENDERERS, name)) {
		throw new Error(
			`unknown renderEmbeddedSource "${name}", not one of ${Object.keys(RENDERERS).join(", ")}`
		);
	}
	const { make, records = false } = RENDERERS[name];
	const render = make(options, log);
	if (spec.async !== true) return { render, records };
	return {
		render: (source, info) =>
			new Promise((resolve) => {
				resolve(render(source, info));
			}),
		records
	};
};

module.exports = { RENDERERS, namedRenderer };
