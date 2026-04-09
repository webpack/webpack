import "./style.css";

it("should make asset available in both CSS and lazy JS chunk", (done) => {
	const promise = import("./mod.js");
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then((mod) => {
				expect(mod.default).toContain("file.txt");
				done();
			}, done);
		})
	);
});
