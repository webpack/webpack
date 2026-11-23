import update from "../../update.esm";
import data from "./data.json";

import.meta.webpackHot.accept("./data.json");

it("should apply an update after undoing a rebuild that changed no code", done => {
	expect(data.value).toBe(1);
	NEXT(
		update(done, true, () => {
			NEXT(
				update(done, true, () => {
					NEXT(
						update(done, true, () => {
							expect(data.value).toBe(2);
							done();
						})
					);
				})
			);
		})
	);
});
