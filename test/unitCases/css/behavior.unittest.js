"use strict";

const { INVARIANT_BUDGET, fixture } = require("../../helpers/fixture");
const { renderBehavior } = require("../../helpers/syntaxInvariants/behavior");

/** @typedef {import("../../helpers/syntaxInvariants/relations").Report} Report */

// The `behavior` relation passes a print only where the browser styles every
// element as the source does, so it is held here to prints that style otherwise.
describe("CSS behavior relation", () => {
	const renders = renderBehavior("css");
	const source = fixture("css", "minimize");

	afterAll(() => renders.close());

	it("passes the source itself without rendering", async () => {
		expect(await renders.difference(source, source)).toEqual([]);
	});

	it("reports a value an element computes otherwise", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				source.replace("margin : 0  auto ;", "margin : 1px auto ;")
			)
		);
		expect(reports.some(({ repro }) => repro.includes("margin-top: "))).toBe(
			true
		);
	}, 60000);

	it("reports a dropped `!important`", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				`${source.replace(" !important", "")}\n.c{color:blue}`
			)
		);
		expect(reports.some(({ repro }) => repro.includes("color: "))).toBe(true);
	}, 60000);

	it("answers nothing for a source past the budget", async () => {
		const large = source + " ".repeat(INVARIANT_BUDGET);
		expect(await renders.difference(large, source)).toBeNull();
	});
});
