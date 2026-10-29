import update from "../../update.esm";
import { getNumber } from "./wasm.wat";

import.meta.webpackHot.accept("./wasm.wat");

it("should update a WebAssembly module that moved into a new initial chunk", (done) => {
	expect(getNumber()).toBe(40);
	NEXT(
		update(done, true, () => {
			import("./wasm.wat")
				.then((updated) => {
					expect(updated.getNumber()).toBe(42);
					done();
				})
				.catch(done);
		})
	);
});
