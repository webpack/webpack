it("should cache modules correctly", function(done) {
	delete require.cache[require.resolve("./singular.js")];
	expect(require("./singular.js").value).toBe(1);
	expect((require("./singular.js")).value).toBe(1);
	require("./sing" + "ular.js").value = 2;
	expect(require("./singular.js").value).toBe(2);
	require.ensure(["./two.js"], function(require) {
		expect(require("./singular.js").value).toBe(2);
		done();
	});
});

it("should be able the remove modules from cache with require.cache and require.resolve", function() {
	var singularObj = require("./singular2");
	var singularId = require.resolve("./singular2");
	var singularIdInConditional = require.resolve(true ? "./singular2" : "./singular");
	if(typeof singularId !== "number" && typeof singularId !== "string")
		throw new Error("require.resolve should return a number or string");
	expect(singularIdInConditional).toBe(singularId);
	expect(require.cache).toBeTypeOf("object");
	expect(require.cache[singularId]).toBeTypeOf("object");
	delete require.cache[singularId];
	expect(require("./singular2")).not.toBe(singularObj);
});
