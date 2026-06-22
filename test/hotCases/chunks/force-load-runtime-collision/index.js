import * as shared from "./shared";

if (module.hot) module.hot.accept("./shared");

it("should merge force-load chunks across colliding runtime updates", (done) => {
	expect(shared.value).toBe(1);
	NEXT(
		require("../../update")(done, true, () => {
			expect(shared.value).toBe(2);
			done();
		})
	);
});
