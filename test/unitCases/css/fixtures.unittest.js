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
const syntax = require("../../helpers/syntaxInvariants/css");

// Every input the CSS tests read is a fixture, and each one is read, printed and
// held to the parser's and printer's own relations; a new fixture needs no code.
describe("CSS syntax — fixtures", () => {
	for (const { name, source, options, expected } of fixtures("css")) {
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
});
