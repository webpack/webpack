import update from "../../update.esm";

const getFile = (name) =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

import.meta.webpackHot.accept("./async-module");

it("should emit the analyzable import under HMR and still apply updates", (done) => {
	import("./async-module")
		.then((mod) => {
			expect(mod.message).toBe("original");

			// Needles are built at runtime so they are not source string literals here.
			const bundle = getFile("main.mjs");
			expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
			expect(bundle).toContain('import("./async-module_js.mjs")');

			NEXT(
				update(done, true, () => {
					import("./async-module")
						.then((updated) => {
							expect(updated.message).toBe("updated");
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
