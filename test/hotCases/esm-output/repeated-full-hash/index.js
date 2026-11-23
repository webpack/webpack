import data from "./data.json";

import.meta.webpackHot.accept("./data.json");

const update = next => err => {
	if (err) throw err;
	import.meta.webpackHot.check(true).then(next);
};

it("should apply an update after undoing a rebuild that changed no code", done => {
	expect(data.value).toBe(1);
	NEXT(
		update(() =>
			NEXT(
				update(() =>
					NEXT(
						update(() => {
							expect(data.value).toBe(2);
							done();
						})
					)
				)
			)
		)
	);
});
