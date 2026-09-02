import update from "../../update.esm";
import { load } from "./lazy";

import.meta.webpackHot.accept("./lazy");

it("should resolve a baked import from the hot update at another depth", (done) => {
	load()
		.then((value) => {
			expect(value).toBe("a");

			NEXT(
				update(done, true, () => {
					import("./lazy")
						.then((updated) => updated.load())
						.then((value) => {
							expect(value).toBe("b");
							done();
						})
						.catch(done);
				})
			);
		})
		.catch(done);
});
