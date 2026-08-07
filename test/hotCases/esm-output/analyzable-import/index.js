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
			const require_ = "__webpack_require__";
			expect(bundle).toContain(`${require_}.ei(`);
			expect(bundle).toContain('import("./async-module_js.mjs")');
			// The hot runtime registers its handler on the map and force-loads through
			// the others by bare chunk id, so both survive an all-analyzable graph.
			expect(bundle).toContain(`${require_}.f = {}`);
			expect(bundle).toContain(`${require_}.f.j =`);

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
