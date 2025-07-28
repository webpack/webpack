import update from "../../update";
import a from "./module-a";

it("should support async accept", (done) => {
	let test = 0;
	expect(a).toEqual(1);

	import.meta.webpackHot.accept(["./module-a"], () => {
		debugger
		return new Promise((resolve) => {
			setTimeout(() => {
				debugger
				test = 1;
				resolve();
			}, 3000);
		});
	});

	NEXT(update(done));

	import.meta.webpackHot.addStatusHandler((status) => {
		if (status === "idle") {
			expect(test).toEqual(1);
			expect(a).toEqual(2);
			done();
		}
	});
});