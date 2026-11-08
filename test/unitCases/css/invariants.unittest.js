"use strict";

const { SourceProcessor } = require("../../../lib/css/syntax");
const { parseAStylesheet } = require("../../../lib/css/syntax-parser");
const {
	fixtures,
	snapshotText,
	unexplained
} = require("../../helpers/fixture");
const { serializeStylesheet } = require("../../helpers/serializeCssTree");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
const syntax = require("../../helpers/syntaxInvariants/css");

// Every input the CSS tests read is a fixture, and each one is read, printed and
// held to the parser's and printer's own relations; a new fixture needs no code.
describe("CSS syntax — invariants", () => {
	const all = fixtures("css");
	for (const { name, source, options, expected } of all) {
		describe(name, () => {
			it("parses", () => {
				expect(
					JSON.stringify(serializeStylesheet(parseAStylesheet(source), source))
				).toMatchSnapshot();
			});

			it.each(options.map((one) => [JSON.stringify(one), one]))(
				"prints %s",
				(_title, one) => {
					expect(
						snapshotText(
							/** @type {{ code: string }} */ (
								new SourceProcessor().process(source, one)
							).code
						)
					).toMatchSnapshot();
				}
			);

			it("holds its invariants", () => {
				expect(
					unexplained(invariantFindings(syntax, [[name, source]]), expected)
				).toEqual([]);
			});
		});
	}

	// Every fixture is read once before any is read again, so state one parse
	// leaves behind shows as a different answer for the next.
	it("reads each fixture alike between all the others", () => {
		const { reports } = purityRelation(
			all.map(({ name, source }) => ({
				what: name,
				digest: () => syntax.digest(source)
			}))
		);
		expect(reports.map((report) => report.repro)).toEqual([]);
	});
});
