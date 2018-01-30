it("should cache modules correctly", function(done) {
	delete require.cache[require.resolve("./singluar.js")];
	expect(require("./singluar.js").value).toBe(1);
	expect((require("./singluar.js")).value).toBe(1);
	require("./sing" + "luar.js").value = 2;
	expect(require("./singluar.js").value).toBe(2);
	require.ensure(["./two.js"], function(require) {
		expect(require("./singluar.js").value).toBe(2);
		done();
	});
});

it("should be able the remove modules from cache with require.cache and require.resolve", function() {
	var singlarObj = require("./singluar2");
	var singlarId = require.resolve("./singluar2");
	var singlarIdInConditional = require.resolve(true ? "./singluar2" : "./singluar");
	if(typeof singlarId !== "number" && typeof singlarId !== "string")
		throw new Error("require.resolve should return a number or string");
	expect(singlarIdInConditional).toBe(singlarId);
	expect(require.cache).toBeTypeOf("object");
	expect(require.cache[singlarId]).toBeTypeOf("object");
	delete require.cache[singlarId];
	expect(require("./singluar2")).not.toBe(singlarObj);
});
