it("should require existing module with supplied error callback", function(done) {
	require.ensure(['./file'], function(){
		var file = require('.file');
		file.should.be.eql("file");
		done();
	}, function(error) {});
});

it("should call error callback on missing module", function(done) {
	require.ensure(['./missingModule'], function(){}, function(error) {
		error.should.be.instanceOf(Error);
		error.message.should.be.eql('Cannot find module "./missingModule"');
		done();
	});
});

it("should call error callback on missing module in context", function(done) {
	(function(module) {
		require.ensure(['./' + module], function(){}, function(error) {
			error.should.be.instanceOf(Error);
			error.message.should.be.eql("Cannot find module './missingModule'.");
			done();
		});
	})('missingModule');
});

it("should call error callback on exception thrown in loading module", function(done) {
	require.ensure(['./throwing'], function(){}, function(error) {
		error.should.be.instanceOf(Error);
		error.message.should.be.eql('message');
		done();
	});
});

it("should not call error callback on exception thrown in require callback", function(done) {
	require.esnure(['./throwing'], function() {
		throw new Error('message');
	}, function(error) {
		error.should.be.instanceOf(Error);
		error.message.should.be.eql('message');
		done();
	});
});
