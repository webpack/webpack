"use strict";

const getClaimedAssetTypes = require("../lib/config/getClaimedAssetTypes");

/**
 * @param {object} options config fragment
 * @param {EXPECTED_ANY[]=} options.minimizer `optimization.minimizer` entries
 * @param {EXPECTED_ANY[]=} options.plugins `plugins` entries
 * @returns {{ css: boolean, html: boolean }} claimed types
 */
const claimed = ({ minimizer, plugins }) =>
	getClaimedAssetTypes(
		/** @type {EXPECTED_ANY} */ ({
			options: { optimization: { minimizer }, plugins }
		})
	);

describe("getClaimedAssetTypes", () => {
	it("reports nothing claimed for an empty configuration", () => {
		expect(claimed({})).toEqual({ css: false, html: false });
		expect(claimed({ minimizer: [], plugins: [] })).toEqual({
			css: false,
			html: false
		});
	});

	it("reads a minimizer's asset matcher", () => {
		expect(claimed({ minimizer: [{ options: { test: /\.css$/i } }] })).toEqual({
			css: true,
			html: false
		});
		expect(claimed({ minimizer: [{ options: { test: /\.html$/i } }] })).toEqual(
			{
				css: false,
				html: true
			}
		);
		expect(
			claimed({ minimizer: [{ options: { test: /\.(css|html)$/i } }] })
		).toEqual({ css: true, html: true });
	});

	it("honours include and exclude", () => {
		expect(
			claimed({ minimizer: [{ options: { include: "file.css" } }] })
		).toEqual({ css: true, html: false });
		expect(
			claimed({
				minimizer: [{ options: { test: /\.css$/i, exclude: /file/ } }]
			})
		).toEqual({ css: false, html: false });
	});

	it("looks at plugins as well as minimizers", () => {
		expect(claimed({ plugins: [{ options: { test: /\.css$/i } }] })).toEqual({
			css: true,
			html: false
		});
	});

	it("ignores entries that are not asset minimizers", () => {
		// The default JS minimizer, a plugin with unrelated options, webpack's own
		// `{ apply }` entry, and the non-object forms `optimization.minimizer`
		// accepts — a matcher-less object must not be read as "claims everything".
		expect(
			claimed({
				minimizer: [
					{ options: { test: /\.[cm]?js(\?.*)?$/i } },
					{ options: { filename: "[name].css" } },
					{ apply: () => {} },
					() => {},
					null,
					undefined
				],
				plugins: [{ options: undefined }]
			})
		).toEqual({ css: false, html: false });
	});

	it("stops at the first claim of each type", () => {
		expect(
			claimed({
				minimizer: [
					{ options: { test: /\.css$/i } },
					{ options: { test: /\.html$/i } },
					{ options: { test: /\.css$/i } }
				]
			})
		).toEqual({ css: true, html: true });
	});
});
