import value from "./module";

const neverCalled = () => import("./lazy");

it("should compile to lazy imported module", done => {
	let generation = 0;
	module.hot.accept("./module", () => {
		generation++;
	});
	expect(value).toBe(42);
	expect(generation).toBe(0);
	NEXT(
		require("../../update")(done, true, () => {
			expect(value).toBe(43);
			expect(generation).toBe(1);
			NEXT(
				require("../../update")(done, true, () => {
					expect(value).toBe(44);
					expect(generation).toBe(2);
					done();
				})
			);
		})
	);
});
