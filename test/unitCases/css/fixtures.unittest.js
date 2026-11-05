"use strict";

const { SourceProcessor } = require("../../../lib/css/syntax");
const { fixtureCases } = require("../../helpers/fixture");

describe("CSS syntax — fixtures", () => {
	it.each(
		fixtureCases("css").map(({ name, source, options }) => [
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
