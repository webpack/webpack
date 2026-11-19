"use strict";

const { INVARIANT_BUDGET, fixture } = require("../../helpers/fixture");
const { renderBehavior } = require("../../helpers/syntaxInvariants/behavior");

/** @typedef {import("../../helpers/syntaxInvariants/relations").Report} Report */

// The `behavior` relation passes a print only where the browser draws it pixel
// for pixel as the source, so it is held here to prints that draw otherwise.
describe("XML behavior relation", () => {
	const renders = renderBehavior("xml");
	const source = fixture("xml", "svg-path-data-closes-subpaths");

	afterAll(() => renders.close());

	it("passes the source itself", async () => {
		expect(await renders.difference(source, source)).toEqual([]);
	}, 60000);

	it("passes a print that spells a paint otherwise", async () => {
		expect(
			await renders.difference(
				source,
				source.replace('stroke="red"', 'stroke="#f00"')
			)
		).toEqual([]);
	}, 60000);

	it("reports a paint drawn otherwise", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				source.split('stroke="red"').join('stroke="blue"')
			)
		);
		expect(reports.map(({ what }) => what)).toEqual(["draws otherwise"]);
		expect(reports[0].repro).toMatch(/^ {4}\d+ pixels draw otherwise, first at /);
	}, 60000);

	it("reports a shape moved", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				source.replace("M0 0h10v10H0z", "M0 0h20v10H0z")
			)
		);
		expect(reports).toHaveLength(1);
	}, 60000);

	it("reports a print drawn at another size", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(
				source,
				source.replace("<svg", '<svg width="32" height="16"')
			)
		);
		expect(reports.map(({ repro }) => repro.trim())).toEqual([
			"draws at 300x150 -> 32x16"
		]);
	}, 60000);

	it("reports a print that parses as no SVG document", async () => {
		const reports = /** @type {Report[]} */ (
			await renders.difference(source, source.replace("<svg", "<svg<"))
		);
		expect(reports.map(({ repro }) => repro.trim())).toEqual([
			"the print parses as no SVG document"
		]);
	}, 60000);

	it("answers nothing for a document no browser draws", async () => {
		const plain = fixture(
			"xml",
			"source-processor-svg-minification-should-preserve-foreign-namespaces-unknown"
		);
		expect(await renders.difference(plain, `${plain}\n`)).toBeNull();
		expect(await renders.difference(plain, plain)).toBeNull();
	}, 60000);

	it("answers nothing for a source past the budget", async () => {
		const large = source + " ".repeat(INVARIANT_BUDGET);
		expect(await renders.difference(large, source)).toBeNull();
	});
});
