it("should run in a realm that really lacks what the target lacks", function () {
	// An ESM context is its own realm, so `restrictEnvironment` has to reach it
	// as well as the script one. `Object.hasOwn` is es2022.
	var name = __STATS__.children[__STATS_I__].name;
	var lacks = name === "es2020" || name === "no-has-own";
	expect(typeof Object.hasOwn).toBe(lacks ? "undefined" : "function");
});

it("should load an async chunk from an es module", function (done) {
	import(/* webpackChunkName: "lazy" */ "./lazy").then(function (module) {
		expect(module.value).toBe(42);
		done();
	}).catch(done);
});
