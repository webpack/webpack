import { getV } from "./mod";

if (module.hot) module.hot.accept("./mod");

it("should force-load a migrated chunk so the module keeps working", (done) => {
	expect(getV()).toBe(1);
	NEXT(
		require("../../update")(done, true, () => {
			// build 2 applied: `mod` now imports `shared` dynamically, so `shared`
			// left main's shared chunk for the "lazy" async chunk and was force-loaded.
			Promise.resolve(getV()).then((v) => {
				expect(v).toBe(1);
				done();
			}, done);
		})
	);
});
