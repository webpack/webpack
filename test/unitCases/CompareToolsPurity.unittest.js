"use strict";

const { purityRelation } = require("../../tooling/compare-tools-harness");

/**
 * One source whose readings are scripted, so a parser that carries state can be
 * stated rather than provoked.
 * @param {string} what what to call it
 * @param {string[]} readings what each reading answers, the last repeating
 * @returns {import("../../tooling/compare-tools-harness").PuritySource} the source
 */
const reading = (what, readings) => {
	let at = 0;
	return {
		what,
		digest: () => readings[Math.min(at++, readings.length - 1)]
	};
};

/**
 * @param {import("../../tooling/compare-tools-harness").PuritySource[]} sources what to read twice
 * @returns {{ what: string[], repro: string[], read: number }} what it made of them
 */
const hold = (sources) => {
	const { reports, read } = purityRelation(sources);
	return {
		what: reports.map((report) => report.what),
		repro: reports.map((report) => report.repro.trim()),
		read
	};
};

describe("the purity relation", () => {
	it("should report nothing when every source reads the same way twice", () => {
		expect(
			hold([reading("a.css", ["one"]), reading("b.css", ["two"])])
		).toEqual({ what: [], repro: [], read: 2 });
	});

	it("should read every source once before reading any of them again", () => {
		/** @type {string[]} */
		const order = [];
		purityRelation([
			{
				what: "a",
				digest: () => {
					order.push("a");
					return "a";
				}
			},
			{
				what: "b",
				digest: () => {
					order.push("b");
					return "b";
				}
			}
		]);
		expect(order).toEqual(["a", "b", "a", "b"]);
	});

	it("should name a source that settles once something else has been read", () => {
		// Reads differently the second time and keeps that answer, which is what
		// state left by another parse looks like.
		expect(hold([reading("a.css", ["first", "second"])])).toEqual({
			what: ["reads differently once something else has been read"],
			repro: ["a.css"],
			read: 1
		});
	});

	it("should tell that apart from a source that never reads the same way", () => {
		expect(hold([reading("a.css", ["one", "two", "three"])])).toEqual({
			what: ["reads differently every time"],
			repro: ["a.css"],
			read: 1
		});
	});

	it("should hold every source, so one finding does not end the sweep", () => {
		expect(
			hold([
				reading("a.css", ["a", "a!"]),
				reading("b.css", ["b"]),
				reading("c.css", ["c", "c!"])
			])
		).toEqual({
			what: [
				"reads differently once something else has been read",
				"reads differently once something else has been read"
			],
			repro: ["a.css", "c.css"],
			read: 3
		});
	});
});
