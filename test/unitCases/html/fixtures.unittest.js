"use strict";

const { SourceProcessor } = require("../../../lib/html/syntax");
const { fixtureCases } = require("../../helpers/fixture");

describe("HTML syntax — fixtures", () => {
	it.each(
		fixtureCases("html").map(({ name, source, options }) => [
			`${name} ${JSON.stringify(options)}`,
			source,
			options
		])
	)("prints %s", (_title, source, options) => {
		expect(
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(source, options)
			).code
		).toMatchSnapshot();
	});
});
