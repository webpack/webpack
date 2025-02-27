it("should not include unused assets", (done) => {
	if (true) {
		done();
		return;
	}

	require("should not require");
});

it("should not include unused assets", (done) => {
	try {
		if (true) {
			done();
			throw new Error("should not throw");
		}

		require("should not require");
	} catch(e) {}
});


it("should not include unused assets", (done) => {
	let a, b;
	(function() {
		try {
			return;

			require("should not require in rest try");
		} finally {
			a = require('./a').value

			{
				try {
					return;
					require("should not require in try inside blockStmt");
				} finally {
					b = require('./b').value
				}
			}

			require("should not require after blockStmt");
		};
	})();

	expect(a).toBe('a')
	expect(b).toBe('b')
	done();
});
