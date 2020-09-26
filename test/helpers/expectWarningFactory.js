module.exports = () => {
	let warnings = [];
	let oldWarn;

	beforeEach(done => {
		oldWarn = console.warn;
		console.warn = m => warnings.push(m);
		done();
	});

	afterEach(done => {
		expectWarning();
		console.warn = oldWarn;
		done();
	});

	const expectWarning = regexp => {
		if (!regexp) {
			expect(warnings).toEqual([]);
		} else {
			expect(warnings).toEqual(
				expect.objectContaining({
					0: expect.stringMatching(regexp),
					length: 1
				})
			);
		}
		warnings.length = 0;
	};

	return expectWarning;
};
