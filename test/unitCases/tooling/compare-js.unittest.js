"use strict";

const CACHE_NAME = "js-tool-comparison";

const installed = jest.fn(() => Promise.resolve(CACHE_NAME));

// The corpus install is the one thing the dispatch must reach without the
// comparison behind it, and a real one would `npm ci` half a gigabyte into a
// contributor's cache — so the harness answers for it here.
jest.mock("../../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../../tooling/compare-tools-harness"),
	installPackages: installed
}));

const acorn = require("acorn");
const {
	JS_CUTS,
	behaviorDifference,
	cutDifference,
	roundTrip,
	runMode
} = require("../../../tooling/compare-js-tools");
const { cutsAt } = require("../../../tooling/compare-tools-harness");

// Read before anything clears the mock: an unguarded script installs while
// being required, and a `beforeEach` would erase exactly that evidence.
const callsWhileRequiring = installed.mock.calls.length;

describe("the JavaScript tool comparison — a program cut short", () => {
	const options = {
		sourceType: "module",
		ecmaVersion: "latest",
		ranges: true,
		allowHashBang: true
	};

	it("should cut a program inside every construct it names", () => {
		const program =
			"const a = \"s\", b = 's', c = `t${a}`; /* c */ const r = (/x/);\n" +
			"f(1); if (a) { g(); } const o = { k: [1] }; const h = () => 1;\n" +
			"class K { m() {} } a.b;\n";
		expect(cutsAt(program, JS_CUTS).map(([where]) => where)).toEqual(
			JS_CUTS.map(([where]) => where)
		);
	});

	it("should hold a cut acorn reads to acorn's tree, and one it refuses to a SyntaxError", () => {
		expect(cutDifference("f(1);", options)).toEqual([]);
		expect(cutDifference("f(1,", options)).toEqual([]);
		expect(cutDifference("`x${", options)).toEqual([]);
	});

	describe("with a parser reading a cut program differently", () => {
		/**
		 * @param {(source: string) => EXPECTED_ANY} parse the stand-in parser
		 * @returns {typeof cutDifference} the relation reading with it
		 */
		const withParser = (parse) => {
			/** @type {EXPECTED_ANY} */
			let isolated;
			jest.isolateModules(() => {
				jest.doMock("../../../lib/javascript/syntax-parser", () => ({
					...jest.requireActual("../../../lib/javascript/syntax-parser"),
					parse
				}));
				isolated = require("../../../tooling/compare-js-tools");
			});
			jest.unmock("../../../lib/javascript/syntax-parser");
			return isolated.cutDifference;
		};

		it("should report a tree where acorn refuses the program", () => {
			const accepting = withParser(() => ({ type: "Program", body: [] }));
			expect(accepting("f(1,", options)).toEqual([
				{
					relation: "acorn",
					what: "a cut program acorn rejects reads to a tree",
					repro: "    …f(1,"
				}
			]);
		});

		it("should report a refusal of what acorn reads", () => {
			const refusing = withParser(() => {
				throw new SyntaxError("Unexpected token");
			});
			expect(refusing("f(1);", options)).toEqual([
				{
					relation: "acorn",
					what: "a cut program acorn reads is refused",
					repro: "    …f(1);: Unexpected token"
				}
			]);
		});

		it("should report a refusal that is no SyntaxError", () => {
			const crashing = withParser(() => {
				throw new TypeError("cannot read properties of undefined");
			});
			expect(crashing("f(1,", options)).toEqual([
				{
					relation: "acorn",
					what: "a cut program throws TypeError, not a SyntaxError",
					repro: "    …f(1,"
				}
			]);
			// Where acorn reads the cut, any refusal is reported, a crash among them.
			expect(crashing("f(1);", options)).toEqual([
				{
					relation: "acorn",
					what: "a cut program acorn reads is refused",
					repro: "    …f(1);: cannot read properties of undefined"
				}
			]);
		});
	});
});

describe("the JavaScript tool comparison", () => {
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

describe("the printing table's last column", () => {
	const source =
		'/*! a license */\n/** @license MIT */\nvar s = "/*! not one */"; /* plain */ a.b = 1;';

	it("should find nothing where the output keeps every name and notice", () => {
		expect(
			roundTrip(
				acorn,
				new Set(["b"]),
				["! a license ", "* @license MIT "],
				"/*! a license */\n/** @license MIT */\na.b=1",
				"script"
			)
		).toBe("-");
	});

	it("should name the legal notices and property names the output dropped", () => {
		expect(
			roundTrip(acorn, new Set(["b", "c"]), ["! a ", "! b "], "a.b=1", "script")
		).toBe(
			"1 names! e.g. c, 2 legal notices!"
		);
		expect(
			roundTrip(acorn, new Set(), ["! a license ", "! b "], "/*! a license */", "script")
		).toBe(
			"1 legal notice!"
		);
	});

	it("should name a notice the output changed or replaced with another", () => {
		const notices = ["! a ", "! b "];
		expect(
			roundTrip(acorn, new Set(), notices, "/*! a *//*! a */", "script")
		).toBe("1 legal notice!");
		expect(
			roundTrip(acorn, new Set(), notices, "/*! b *//*! a */", "script")
		).toBe("-");
	});

	it("should not count a `/*!` inside a string as a notice", () => {
		expect(roundTrip(acorn, new Set(), [], source, "script")).toBe("-");
		expect(
			roundTrip(
				acorn,
				new Set(),
				["! a license ", "* @license MIT ", "! not one "],
				source,
				"script"
			)
		).toBe("1 legal notice!");
	});

	it("should say when the output does not parse back", () => {
		expect(roundTrip(acorn, new Set(), [], "a.=", "script")).toMatch(
			/^will not parse back: /
		);
	});
});

describe("the behavior relation", () => {
	it("should report a printed script printing otherwise than its source", () => {
		const [report] = /** @type {import("../../helpers/syntaxInvariants/relations").Report[]} */ (
			behaviorDifference("console.log((1, 2));", "console.log(1,2);")
		);

		expect(report.relation).toBe("behavior");
		expect(report.repro).toContain("2");
		expect(report.repro).toContain("1 2");
	});

	it("should report a printed script throwing otherwise", () => {
		const reports = behaviorDifference("var a = {};", "var a; a.b.c;");

		expect(reports).toHaveLength(1);
		expect(
			/** @type {import("../../helpers/syntaxInvariants/relations").Report[]} */ (
				reports
			)[0].repro
		).toContain("threw <TypeError>");
		expect(
			/** @type {import("../../helpers/syntaxInvariants/relations").Report[]} */ (
				behaviorDifference("var a;", "throw 1;")
			)[0].repro
		).toContain("threw <number> 1");
	});

	it("should report a printed script throwing another message or value", () => {
		expect(
			behaviorDifference('throw new Error("a");', 'throw new Error("b");')
		).toHaveLength(1);
		expect(behaviorDifference("throw 1;", "throw 2;")).toHaveLength(1);
		expect(behaviorDifference("throw {};", "throw {};")).toEqual([]);
		const unreadable =
			'throw { get message() { throw new Error("getter"); } };';
		expect(behaviorDifference(unreadable, unreadable)).toEqual([]);
	});

	it("should find nothing where the printed script runs the same", () => {
		expect(
			behaviorDifference(
				"function f() {} console.log(f, typeof f);",
				"function f(){}console.log(f,typeof f);"
			)
		).toEqual([]);
	});

	it("should run a script reading the clock or a random number on fixed ones", () => {
		const source =
			"console.log(Math.random(), Date.now(), new Date().getTime(), Date());";

		expect(behaviorDifference(source, source)).toEqual([]);
		expect(
			behaviorDifference(source, "console.log(Math.random());")
		).toHaveLength(1);
	});

	it("should report a printed script that times out", () => {
		const [report] = /** @type {import("../../helpers/syntaxInvariants/relations").Report[]} */ (
			behaviorDifference("console.log(1);", "for (;;) {}")
		);

		expect(report.what).toBe("times out");
		expect(report.repro).toContain("<timeout>");
	});

	it("should not run a script that loops or is too long", () => {
		expect(behaviorDifference("for (;;) {}", "")).toBeNull();
		expect(behaviorDifference(`/*${" ".repeat(20000)}*/`, "")).toBeNull();
	});
});
