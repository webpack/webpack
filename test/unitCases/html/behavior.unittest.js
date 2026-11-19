"use strict";

const { INVARIANT_BUDGET, fixture } = require("../../helpers/fixture");
const { renderBehavior } = require("../../helpers/syntaxInvariants/behavior");

// The `behavior` relation passes a print only where the browser renders it as
// the source, so it is held here to prints that render otherwise.
describe("HTML behavior relation", () => {
	const renders = renderBehavior("html");
	const source = fixture("html", "minimize-collapse-whitespace");

	afterAll(() => renders.close());

	it("passes the source itself without rendering", async () => {
		expect(await renders.difference(source, source)).toEqual([]);
	});

	it("reports text a reader sees otherwise", async () => {
		const reports = await renders.difference(
			source,
			source.replace("friends", "foes")
		);
		expect(reports).not.toBeNull();
		expect(
			/** @type {import("../../helpers/syntaxInvariants/relations").Report[]} */ (
				reports
			).map(({ repro }) => repro.slice(0, repro.indexOf(":")).trim())
		).toEqual(["360px text at 15", "1400px text at 15"]);
	}, 60000);

	it("reports a box laid out otherwise", async () => {
		const reports = await renders.difference(
			source,
			source.replace("  kept\n   verbatim", "kept verbatim")
		);
		expect(
			/** @type {import("../../helpers/syntaxInvariants/relations").Report[]} */ (
				reports
			).some(({ repro }) => repro.includes("html > body > <pre>"))
		).toBe(true);
	}, 60000);

	it("answers nothing for a source past the budget", async () => {
		const large = source + " ".repeat(INVARIANT_BUDGET);
		expect(await renders.difference(large, source)).toBeNull();
	});
});
