it("should require existing module with supplied error callback", function(done) {
	require(['./file'], function(file){
		try {
			file.should.be.eql("file");
			done();
		} catch(e) { done(e); }
	}, function(error) { done(error); });
});

it("should call error callback on missing module", function(done) {
	require(['./file', './missingModule'], function(file){}, function(error) {
		try {
			error.should.be.instanceOf(Error);
			error.message.should.be.eql('Cannot find module "./missingModule"');
			done();
		} catch(e) {
			done(e);
		}
	});
});

it("should call error callback on missing module in context", function(done) {
	(function(module) {
		require(['./' + module], function(file){}, function(error) {
			try {
				error.should.be.instanceOf(Error);
				error.message.should.be.eql("Cannot find module \"./missingModule\".");
				done();
			} catch(e) { done(e); }
		});
	})('missingModule');
});

it("should call error callback on exception thrown in loading module", function(done) {
	require(['./throwing'], function(){}, function(error) {
		try {
			error.should.be.instanceOf(Error);
			error.message.should.be.eql('message');
			done();
		} catch(e) { done(e); }
	});
});

it("should not call error callback on exception thrown in require callback", function(done) {
	require(['./throwing'], function() {
		throw new Error('message');
	}, function(error) {
		try {
			error.should.be.instanceOf(Error);
			error.message.should.be.eql('message');
			done();
		} catch(e) { done(e); }
	});
});
