import html from "./page.html";

it("should hot-update an HTML module whose inline <style> body changed", (done) => {
	expect(html).toContain("color: red");
	expect(html).not.toContain("color: blue");

	NEXT(
		require("../../update")(done, true, () => {
			// The inline <style> body is reparsed at HTML parse time; the
			// new CSS text is inlined into the rewritten HTML the JS shim
			// exports. The HTML module is self-accepting, so re-requiring
			// returns the updated string.
			const updated = require("./page.html");
			expect(updated).toContain("color: blue");
			expect(updated).not.toContain("color: red");
			done();
		})
	);
});
