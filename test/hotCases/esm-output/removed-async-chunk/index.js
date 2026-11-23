import { value, load } from "./module";

import.meta.webpackHot.accept("./module");

const update = next => err => {
	if (err) throw err;
	import.meta.webpackHot.check(true).then(next);
};

it("should keep applying updates after a loaded async chunk is removed", done => {
	expect(value).toBe(1);
	load().then(() => {
		NEXT(
			update(() =>
				NEXT(
					update(() => {
						expect(value).toBe(2);
						done();
					})
				)
			)
		);
	}, done);
});
