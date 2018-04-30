var should = require("should");

it("should cache modules correctly", function(done) {
	delete require.cache[require.resolve("./singular.js")];
	require("./singular.js").value.should.be.eql(1);
	(require("./singular.js")).value.should.be.eql(1);
	require("./sing" + "ular.js").value = 2;
	require("./singular.js").value.should.be.eql(2);
	require.ensure(["./two.js"], function(require) {
		require("./singular.js").value.should.be.eql(2);
		done();
	});
});

it("should be able the remove modules from cache with require.cache and require.resolve", function() {
	var singularObj = require("./singular2");
	var singularId = require.resolve("./singular2");
	var singularIdInConditional = require.resolve(true ? "./singular2" : "./singular");
	if(typeof singularId !== "number" && typeof singularId !== "string")
		throw new Error("require.resolve should return a number or string");
	singularIdInConditional.should.be.eql(singularId);
	(require.cache).should.have.type("object");
	(require.cache[singularId]).should.have.type("object");
	delete require.cache[singularId];
	require("./singular2").should.be.not.equal(singularObj);
});
