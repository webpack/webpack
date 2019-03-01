// This test verifies that values exported by a webpack bundle are consumable by systemjs.

export const namedThing = {
	hello: 'there'
}

export default 'the default export'

it("should successfully export values to System", function(done) {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	// set timeout allows the webpack bundle to finish exporting, which exports to System at the very
	// end of its execution.
	setTimeout(() => {
		expect(global.SystemExports['default']).toBe('the default export')
		expect(global.SystemExports.namedThing).toBe(namedThing)
		delete global.System;
		delete global.SystemExports
		done()
	})
});