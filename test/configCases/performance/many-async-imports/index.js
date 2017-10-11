import promise from "./start";

it("should compile a module with many async imports in acceptable time", function(done) {
	promise.then(() => done(), e => done(e));
});
