import html from "./page.html";
import update from "../../update.esm.js";

// In ESM output, HMR is wired through `import.meta.webpackHot`. Importer
// accepts the HTML module so it can re-import after each update.
import.meta.webpackHot.accept(["./page.html"]);

it("should hot-update an HTML module with ESM output", (done) => {
	expect(html).toContain("esm output v1");

	NEXT(
		update(done, true, () => {
			import("./page.html")
				.then((updated) => {
					expect(updated.default).toContain("esm output v2");
					done();
				})
				.catch(done);
		})
	);
});
