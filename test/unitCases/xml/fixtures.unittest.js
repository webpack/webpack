"use strict";

const { SourceProcessor } = require("../../../lib/html/syntax");
const { A, parseHtml } = require("../../../lib/html/syntax-parser");
const {
	fixtures,
	snapshotText,
	unexplained
} = require("../../helpers/fixture");
const { materialize } = require("../../helpers/materializeHtmlTree");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/xml");

// Every input the XML tests read is a fixture, and each one is read, printed
// and held to the parser's and printer's own relations; a new fixture needs no
// code.
describe("XML syntax — fixtures", () => {
	for (const { name, source, options, expected } of fixtures("xml")) {
		describe(name, () => {
			it("parses", () => {
				const document = parseHtml(source, 0, { xml: true });
				expect(
					JSON.stringify(A.children(document).map(materialize))
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
