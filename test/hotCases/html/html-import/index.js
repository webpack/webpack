import html from "./page.html";

it("should hot-update an HTML module imported as a string", (done) => {
	expect(typeof html).toBe("string");
	expect(html).toContain("version 1");

	// The HTML module self-accepts, so on hot update the JS shim is
	// re-evaluated and the module cache exposes the new string. The
	// importer's local binding `html` is captured at import time and
	// does NOT auto-update — that's why we re-require below.
	NEXT(
		require("../../update")(done, true, () => {
			const updated = require("./page.html");
			expect(updated).toContain("version 2");

			NEXT(
				require("../../update")(done, true, () => {
					const updated2 = require("./page.html");
					expect(updated2).toContain("version 3");
					done();
				})
			);
		})
	);
});
