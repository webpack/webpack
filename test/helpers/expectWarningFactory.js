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

	const expectWarning = (...regexp) => {
		expect(warnings).toEqual(regexp.map(r => expect.stringMatching(r)));
		warnings.length = 0;
	};

	return expectWarning;
};
