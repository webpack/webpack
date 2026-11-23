import update from "../../update.esm";
import { value, load } from "./module";

import.meta.webpackHot.accept("./module");

it("should keep applying updates after a loaded async chunk is removed", done => {
	expect(value).toBe(1);
	load().then(() => {
		NEXT(
			update(done, true, () => {
				NEXT(
					update(done, true, () => {
						expect(value).toBe(2);
						done();
					})
				);
			})
		);
	}, done);
});
