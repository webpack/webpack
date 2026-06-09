"use strict";

module.exports = () => {
	/** @type {string[]} */
	const warnings = [];
	/** @type {typeof console.warn} */
	let oldWarn;

	beforeEach((done) => {
		oldWarn = console.warn;
		console.warn = (m) => warnings.push(m);
		done();
	});

	afterEach((done) => {
		expectWarning();
		console.warn = oldWarn;
		done();
	});

	/**
	 * @param {...(string | RegExp)} regexp expected warning patterns
	 * @returns {void}
	 */
	const expectWarning = (...regexp) => {
		expect(warnings).toEqual(regexp.map((r) => expect.stringMatching(r)));
		warnings.length = 0;
	};

	return expectWarning;
};
