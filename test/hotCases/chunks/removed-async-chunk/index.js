import { value, load } from "./module";

it("should keep applying updates after a loaded async chunk is removed", done => {
	expect(value).toBe(1);
	load().then(() => {
		NEXT(
			require("../../update")(done, true, () => {
				NEXT(
					require("../../update")(done, true, () => {
						expect(value).toBe(2);
						done();
					})
				);
			})
		);
	}, done);
});

module.hot.accept("./module");
