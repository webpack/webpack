import update from "../../update.esm.js";

export { count, label, increment } from "./store.js";

import.meta.webpackHot.accept(["./store.js"]);

it("should keep the library's exports live across a hot update", (done) => {
	import(/* webpackIgnore: true */ "./main.mjs").then((library) => {
		expect([library.count, library.label]).toEqual([0, "a"]);
		expect(library.increment()).toBe(0);
		expect(library.count).toBe(1);
		NEXT(
			update(done, true, () => {
				expect([library.count, library.label]).toEqual([10, "b"]);
				expect(library.increment()).toBe(12);
				expect(library.count).toBe(12);
				done();
			})
		);
	}, done);
});
