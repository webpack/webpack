import getValue, { getError, id } from "./a";

const moduleId = id;

it("should abort when module is not accepted", done => {
	expect(getValue()).toBe(1);
	expect(getError()).toBe(false);
	NEXT(
		require("../../update")(done, true, () => {
			expect(getValue()).toBe(2);
			expect(getError()).toBe(true);
			NEXT(
				require("../../update")(done, true, () => {
					expect(getValue()).toBe(2);
					expect(getError()).toBe(true);
					NEXT(
						require("../../update")(done, true, () => {
							expect(getValue()).toBe(4);
							expect(getError()).toBe(false);
							done();
						})
					);
				})
			);
		})
	);
});

if (module.hot) {
	module.hot.accept("./a");
}
