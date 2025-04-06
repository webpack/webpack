module.exports = function supportsAsync() {
	let isAsync = true;

	try {
		eval("async () => {}");
	} catch (err) {
		if (err instanceof SyntaxError) isAsync = false;
		else throw err; // throws CSP error
	}

	return isAsync;
};
