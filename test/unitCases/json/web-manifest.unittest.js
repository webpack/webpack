"use strict";

const { fixture } = require("../../helpers/fixture");

// URL extraction, ranges and invalid JSON are covered by the `webmanifest-*`
// config cases; these cover the shapes the config cases don't write.
const WebManifestParser = require("../../../lib/asset/WebManifestParser");

/**
 * @param {string | Buffer} source the manifest
 * @param {boolean=} buildHttp whether remote URLs are bundled
 * @returns {{ request: string, range: [number, number] }[]} the dependencies the parse adds
 */
const parseManifest = (source, buildHttp = false) => {
	/** @type {{ request: string, range: [number, number] }[]} */
	const dependencies = [];
	const module = {
		context: "/project",
		buildInfo: {},
		/** @param {{ request: string, range: [number, number] }} dep the dependency */
		addDependency: (dep) => dependencies.push(dep),
		addCodeGenerationDependency: () => {}
	};
	new WebManifestParser().parse(
		source,
		/** @type {EXPECTED_ANY} */ ({
			module,
			options: { experiments: { buildHttp } }
		})
	);
	return dependencies;
};

/**
 * @param {Buffer} buffer the raw manifest
 * @param {{ range: [number, number] }} dep a dependency the parse added
 * @returns {string} the bytes its range covers
 */
const covered = (buffer, dep) =>
	buffer.subarray(dep.range[0], dep.range[1]).toString("utf8");

describe("WebManifestParser", () => {
	it("throws on a preparsed AST", () => {
		expect(() =>
			new WebManifestParser().parse(
				/** @type {EXPECTED_ANY} */ ({}),
				/** @type {EXPECTED_ANY} */ ({})
			)
		).toThrow("webpackAst is unexpected");
	});

	it("reads icon sources past holes, non-objects and unquoted keys", () => {
		const source = Buffer.from(
			fixture(
				"json",
				"web-manifest-parser-reads-icon-sources-past-holes-non-objects-and-unquoted-keys"
			)
		);
		const deps = parseManifest(source);
		expect(deps.map((dep) => covered(source, dep))).toEqual([
			"a.png",
			"b.png",
			"c.png",
			"g.png"
		]);
	});

	it("bundles remote icons only with buildHttp", () => {
		const source = Buffer.from(
			fixture(
				"json",
				"web-manifest-parser-bundles-remote-icons-only-with-build-http"
			)
		);
		expect(parseManifest(source)).toHaveLength(0);
		expect(
			parseManifest(source, true).map((dep) => covered(source, dep))
		).toEqual(["https://x/y.png"]);
	});

	it("offsets past a byte order mark", () => {
		const source = Buffer.concat([
			Buffer.from([0xef, 0xbb, 0xbf]),
			Buffer.from(
				fixture("json", "web-manifest-parser-offsets-past-a-byte-order-mark")
			)
		]);
		const deps = parseManifest(source);
		expect(deps.map((dep) => covered(source, dep))).toEqual(["ä.png"]);
	});

	it.each([
		[
			"an empty file",
			fixture("json", "web-manifest-parser-leaves-an-empty-file-untouched")
		],
		[
			"invalid JSON",
			fixture("json", "web-manifest-parser-leaves-invalid-json-untouched")
		],
		[
			"a top-level array",
			fixture("json", "web-manifest-parser-leaves-a-top-level-array-untouched")
		],
		[
			"a top-level string",
			fixture("json", "web-manifest-parser-leaves-a-top-level-string-untouched")
		],
		[
			"two statements",
			fixture("json", "web-manifest-parser-leaves-two-statements-untouched")
		]
	])("leaves %s untouched", (_name, source) => {
		expect(parseManifest(source)).toHaveLength(0);
	});
});
