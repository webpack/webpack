import value from "./module";
import value2 from "./module2";

import.meta.webpackHot.accept("./module");
import.meta.webpackHot.accept("./module2");

it("should merge multiple updates when not using apply", done => {
	expect(value).toBe(42);
	expect(value2).toBe(42);
	NEXT(err => {
		if (err) return done(err);
		NEXT(err => {
			if (err) return done(err);
			module.hot
				.check()
				.then(updatedModules => {
					expect(updatedModules).toEqual(["./module.js", "./module2.js"]);
					return module.hot.check(true).then(updatedModules => {
						expect(updatedModules).toEqual(["./module.js", "./module2.js"]);
						try {
							expect(value).toBe(43);
							expect(value2).toBe(43);
						} catch (e) {
							return done(e);
						}
						done();
					});
				})
				.catch(err => {
					done(err);
				});
		});
	});
});
