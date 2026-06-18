"use strict";

const parseWebpackEntryOptions = require("../lib/util/parseWebpackEntryOptions");

describe("parseWebpackEntryOptions", () => {
	const loc = /** @type {import("../lib/Dependency").DependencyLocation} */ ({
		start: { line: 1, column: 0 },
		end: { line: 1, column: 1 }
	});

	/**
	 * @param {Record<string, EXPECTED_ANY>} importOptions importOptions
	 * @returns {{ entryOptions: import("../lib/Entrypoint").EntryOptions | undefined, warnings: unknown[] }} result
	 */
	const parse = (importOptions) => {
		/** @type {unknown[]} */
		const warnings = [];
		const entryOptions = parseWebpackEntryOptions(
			importOptions,
			(w) => warnings.push(w),
			loc
		);
		return { entryOptions, warnings };
	};

	it("returns undefined when importOptions is undefined", () => {
		expect(parseWebpackEntryOptions(undefined, () => {}, loc)).toBeUndefined();
	});

	it("parses webpackChunkName", () => {
		expect(parse({ webpackChunkName: "my-chunk" }).entryOptions).toEqual({
			name: "my-chunk"
		});
	});

	it("parses webpackEntryOptions with safe keys", () => {
		expect(
			parse({ webpackEntryOptions: { name: "from-options", runtime: false } })
				.entryOptions
		).toEqual({ name: "from-options", runtime: false });
	});

	it("webpackChunkName overrides webpackEntryOptions name", () => {
		expect(
			parse({
				webpackEntryOptions: { name: "from-options" },
				webpackChunkName: "from-chunk-name"
			}).entryOptions
		).toEqual({ name: "from-chunk-name" });
	});

	it("ignores prototype pollution keys", () => {
		/** @type {Record<string, string>} */
		const options = { name: "safe", polluted: "no" };
		Object.defineProperty(options, "__proto__", {
			value: { polluted: "yes" },
			enumerable: true
		});
		Object.defineProperty(options, "constructor", {
			value: { polluted: "yes" },
			enumerable: true
		});
		Object.defineProperty(options, "prototype", {
			value: { polluted: "yes" },
			enumerable: true
		});

		expect(parse({ webpackEntryOptions: options }).entryOptions).toEqual({
			name: "safe",
			polluted: "no"
		});
	});

	it("warns on invalid webpackEntryOptions type", () => {
		const { entryOptions, warnings } = parse({ webpackEntryOptions: "bad" });
		expect(entryOptions).toBeUndefined();
		expect(warnings).toHaveLength(1);
	});

	it("warns on invalid webpackChunkName type", () => {
		const { entryOptions, warnings } = parse({ webpackChunkName: 123 });
		expect(entryOptions).toBeUndefined();
		expect(warnings).toHaveLength(1);
	});
});
