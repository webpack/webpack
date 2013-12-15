var should = require("should");

it("should cache modules correctly", function(done) {
	delete require.cache[require.resolve("./singluar.js")];
	require("./singluar.js").value.should.be.eql(1);
	(require("./singluar.js")).value.should.be.eql(1);
	require("./sing" + "luar.js").value = 2;
	require("./singluar.js").value.should.be.eql(2);
	require.ensure(["./two.js"], function(require) {
		require("./singluar.js").value.should.be.eql(2);
		done();
	});
});

it("should be able the remove modules from cache with require.cache and require.resolve", function() {
	var singlarObj = require("./singluar2");
	var singlarId = require.resolve("./singluar2");
	var singlarIdInConditional = require.resolve(true ? "./singluar2" : "./singluar");
	singlarId.should.have.type("number");
	singlarIdInConditional.should.be.eql(singlarId);
	(require.cache).should.have.type("object");
	(require.cache[singlarId]).should.have.type("object");
	delete require.cache[singlarId];
	require("./singluar2").should.be.not.equal(singlarObj);
});
