"use strict";

const CACHE_NAME = "html-tool-comparison";

const installed = jest.fn(() => Promise.resolve(CACHE_NAME));

// A real install would `npm ci` the corpus into a contributor's cache, and
// nothing here reads it: the built documents are the ones under test.
jest.mock("../../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../../tooling/compare-tools-harness"),
	installPackages: installed
}));

const fs = require("fs");
const path = require("path");
const { SourceProcessor } = require("../../../lib/html/syntax");
const {
	COLD_CONSTRUCTS,
	EMBEDDED_LEGACY_OPTIONS,
	EMBEDDED_OPTIONS,
	htmlMeaning,
	runMode,
	sameSheets,
	sweepDocument
} = require("../../../tooling/compare-html-tools");
const { collectFiles } = require("../../../tooling/compare-tools-harness");

// Read before anything clears the mock: an unguarded script installs while
// being required, and a `beforeEach` would erase exactly that evidence.
const callsWhileRequiring = installed.mock.calls.length;

describe("the HTML tool comparison", () => {
	it("should start nothing when the script is required rather than run", () => {
		expect(callsWhileRequiring).toBe(0);
	});

	it("should install the corpus and stop on `--setup`", async () => {
		installed.mockClear();

		await expect(runMode("--setup")).resolves.toBe(CACHE_NAME);

		expect(installed).toHaveBeenCalledTimes(1);
		expect(installed).toHaveBeenCalledWith(CACHE_NAME);
	});
});

const ROOT = path.join(__dirname, "..", "..", "..");

// cspell:ignore popovertarget popovertargetaction contenteditable exportparts
// cspell:ignore autocapitalize referrerpolicy accesskey writingsuggestions

// The fixture exists to reach what the rest of the corpus does not, so each of
// these is the reason a line of it is there. One edited away takes its reach
// with it, which is what these hold.
const COLD = [
	["details", "<details"],
	["summary", "<summary"],
	["bdi", "<bdi"],
	["bdo", "<bdo"],
	["wbr", "<wbr"],
	["datalist", "<datalist"],
	["fieldset", "<fieldset"],
	["legend", "<legend"],
	["search", "<search"],
	["hgroup", "<hgroup"],
	["menu", "<menu"],
	["loading", "loading="],
	["is", " is="],
	["exportparts", "exportparts"],
	["col", "<col "],
	["nomodule", "nomodule"]
];

// What the printer branches on that the corpus does carry, but thinly — kept
// here so a fixture rewrite cannot quietly drop the whole class.
const THIN = [
	["dialog", "<dialog"],
	["picture", "<picture"],
	["ruby", "<ruby"],
	["progress", "<progress"],
	["meter", "<meter"],
	["optgroup", "<optgroup"],
	["colgroup", "<colgroup"],
	["tfoot", "<tfoot"],
	["noscript", "<noscript"],
	["popover", "popover="],
	["popovertarget", "popovertarget"],
	["enterkeyhint", "enterkeyhint"],
	["inputmode", "inputmode"],
	["fetchpriority", "fetchpriority"],
	["spellcheck", "spellcheck"],
	["draggable", "draggable"],
	["contenteditable", "contenteditable"],
	["autocapitalize", "autocapitalize"],
	["referrerpolicy", "referrerpolicy"],
	["translate", "translate="],
	["accesskey", "accesskey"],
	["slot", "slot="],
	["popovertargetaction", "popovertargetaction"],
	["writingsuggestions", "writingsuggestions"],
	["thead", "<thead"]
];

/**
 * @param {string} html a document
 * @param {import("../../../lib/html/syntax-printer").HtmlPrintOptions} options print options
 * @returns {string} it, minified
 */
const minify = (html, options) =>
	new SourceProcessor().process(html, { mode: "minify", ...options }).code;

describe("compare-html-tools — the cold constructs fixture", () => {
	it.each(COLD.concat(THIN))("carries %s", (_name, probe) => {
		expect(COLD_CONSTRUCTS.toLowerCase()).toContain(probe.toLowerCase());
	});

	it("carries the constructs no document in the test tree does", () => {
		// The installed half is not read here: it is fetched, so a checkout
		// without it would read this as reach the fixture does not have.
		const others = collectFiles(
			path.join(ROOT, "test"),
			".html",
			// What the sweep skips: build output and the conformance suites, which
			// are not the corpus it reads.
			new Set(["js", "node_modules", "wpt"])
		).map((file) => fs.readFileSync(file, "utf8").toLowerCase());
		const reached = COLD.filter(([, probe]) =>
			others.some((doc) => doc.includes(probe.toLowerCase()))
		).map(([name]) => name);
		expect(reached).toEqual([]);
	});

	it("carries a `<style>` the printer has something to lower in", () => {
		const style = COLD_CONSTRUCTS.slice(
			COLD_CONSTRUCTS.indexOf("<style>") + "<style>".length,
			COLD_CONSTRUCTS.indexOf("</style>")
		);
		// Each of these is a rewrite that only runs for a target that reads less
		// than the newest does, which is what the legacy preset names.
		expect(style).toContain("light-dark(");
		expect(style).toContain("text-decoration:underline dotted");
		expect(style).toContain("inset:");
		expect(style).toContain("@layer");
		expect(style).toContain(".b{color:blue}");
	});

	it("is what the two embedded presets disagree on", () => {
		// Without a target named, a `<style>` is minified and nothing in it is
		// lowered — so the preset that names one is only worth running over a
		// document carrying CSS to lower, which is this one.
		const plain = minify(COLD_CONSTRUCTS, EMBEDDED_OPTIONS);
		const legacy = minify(COLD_CONSTRUCTS, EMBEDDED_LEGACY_OPTIONS);
		expect(legacy).not.toBe(plain);
		expect(plain).toContain("light-dark(");
		expect(legacy).not.toContain("light-dark(");
		expect(legacy).toContain("--webpack-light");
	});

	it("is its own output under every preset it is swept with", () => {
		for (const options of [EMBEDDED_OPTIONS, EMBEDDED_LEGACY_OPTIONS]) {
			const once = minify(COLD_CONSTRUCTS, options);
			expect(minify(once, options)).toBe(once);
		}
	});
});

describe("compare-html-tools — what a document says", () => {
	it("reads the words, each sheet, and the element tree when asked", () => {
		const html =
			'<p class="  a  " title="x">one  <b>two</b>\n</p><style>.a { color : #ff0000 }</style><script>let  a</script>';
		const { said, sheets } = htmlMeaning(html, true, {});
		expect(said).toEqual([
			"<0:html >",
			"<0:head >",
			"</head>",
			"<0:body >",
			"<0:p class title>",
			"one",
			"<0:b >",
			"two",
			"</b>",
			"</p>",
			"<0:style >",
			"</style>",
			"<0:script >",
			"</script>",
			"</body>",
			"</html>"
		]);
		expect(sheets).toEqual([".a{color:red}"]);
		expect(htmlMeaning(html, false, {}).said).toEqual(["one", "two"]);
	});

	it("matches a merged or folded sheet against the sheets it came from", () => {
		expect(sameSheets([".a{color:red}", ".b{color:red}"], [".a,.b{color:red}"], {})).toBe(true);
		expect(sameSheets([".a{color:red}", ".b{color:red}"], [".a{color:red}"], {})).toBe(false);
		expect(sameSheets([".a{color:red}"], [".a{color:blue}"], {})).toBe(false);
		// Read apart, an open value cannot swallow the next sheet.
		expect(
			sameSheets([".a{--x:f(", ".b{color:red}"], [".a{--x:f(", ".b{color:red}"], {})
		).toBe(true);
	});

	it("reports a printer that drops a word, an element or a rule", () => {
		const html = "<p>one two</p><b>x</b><style>.a{color:red}</style>";
		/**
		 * @param {(html: string) => string} minify a broken printer
		 * @returns {string[]} the `meaning` findings it earns under `default`
		 */
		const meaning = (minify) =>
			sweepDocument(minify, html, {}, {})
				.filter((report) => report.relation === "meaning")
				.map((report) => report.what);
		expect(meaning((source) => source)).toEqual([]);
		expect(meaning((source) => source.replace("two", ""))).toEqual([
			"the minified document says something else"
		]);
		expect(meaning((source) => source.replace(/<\/?b>/g, ""))).toEqual([
			"the minified document says something else"
		]);
		expect(meaning((source) => source.replace("red", "blue"))).toEqual([
			"a minified stylesheet says something else"
		]);
	});
});
