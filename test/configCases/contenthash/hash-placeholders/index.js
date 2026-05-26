import "./style.css";
import "./page.html";

it("should emit hashed bundles and load an async chunk", (done) => {
	import("./async.js").then((mod) => {
		expect(mod.value).toBe("async-loaded");
		done();
	}, done);
});

it("should emit hashed bundles and load an async CSS chunk", (done) => {
	import("./async.css").then((mod) => {
		expect(mod).toEqual({});
		done();
	}, done);
});
