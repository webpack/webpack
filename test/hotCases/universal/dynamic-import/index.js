import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./chunk.js"]);

it("should update a dynamically imported chunk in a universal target", (done) => {
	import("./chunk.js")
		.then((chunk) => {
			expect(chunk.value).toBe("chunk-1");

			NEXT(
				update(done, true, () => {
					import("./chunk.js")
						.then((updated) => {
							expect(updated.value).toBe("chunk-2");
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
