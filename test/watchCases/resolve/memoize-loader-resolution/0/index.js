const x = require("./x");
const y = x.next;

it("should re-resolve memoized loaders after a resolve dependency changes", () => {
	const step = Number(WATCH_STEP);
	// x is the first (cache-miss) resolve of "my-loader"; y reuses the memoized
	// entry (cache hit). Both must reflect the current package.json "main".
	if (step === 0) {
		// main: a.js
		expect(x.marker).toBe("A");
		expect(y.marker).toBe("A");
	} else {
		// Step 1 rewrites my-loader's package.json "main" to b.js; both the
		// miss and the memoized module must re-resolve to the new loader.
		expect(x.marker).toBe("B");
		expect(y.marker).toBe("B");
	}
});
