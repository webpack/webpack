import { value } from "./reexport";

it("should auto-reexport an ES6 imported value on accept", function (done) {
	expect(value).toBe(1);
	NEXT(
		require("../../update")(done, true, () => {
			expect(value).toBe(2);
			done();
		})
	);
});
