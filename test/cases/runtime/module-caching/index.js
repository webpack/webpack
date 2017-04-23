
it("should cache modules correctly", function(done) {
	delete require.cache[require.resolve("./singluar.js")];
	expect(require("./singluar.js").value).toEqual(1);
	expect((require("./singluar.js")).value).toEqual(1);
	require("./sing" + "luar.js").value = 2;
	expect(require("./singluar.js").value).toEqual(2);
	require.ensure(["./two.js"], function(require) {
		expect(require("./singluar.js").value).toEqual(2);
		done();
	});
});

it("should be able the remove modules from cache with require.cache and require.resolve", function() {
	var singlarObj = require("./singluar2");
	var singlarId = require.resolve("./singluar2");
	var singlarIdInConditional = require.resolve(true ? "./singluar2" : "./singluar");
	if(typeof singlarId !== "number" && typeof singlarId !== "string")
		throw new Error("require.resolve should return a number or string");

	expect(singlarIdInConditional).toEqual(singlarId);
	expect(require.cache).toEqual({
		[singlarId]: expect.any(Object),
	});

	delete require.cache[singlarId];
	expect(require("./singluar2")).not.toEqual(singlarObj);
});
