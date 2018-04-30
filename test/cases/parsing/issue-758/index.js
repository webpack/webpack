it("should require existing module with supplied error callback", function(done) {
	require.ensure(['./file'], function(){
		try {
			var file = require('./file');
			file.should.be.eql("file");
			done();
		} catch(e) { done(e); }
	}, function(error) {});
});

it("should call error callback on missing module", function(done) {
	require.ensure(['./missingModule'], function(){
		require('./missingModule');
	}, function(error) {
		error.should.be.instanceOf(Error);
		error.message.should.be.eql('Cannot find module "./missingModule"');
		done();
	});
});

it("should call error callback on missing module in context", function(done) {
	(function(module) {
		require.ensure([], function(){
			require('./' + module);
		}, function(error) {
			error.should.be.instanceOf(Error);
			error.message.should.be.eql("Cannot find module \"./missingModule\".");
			done();
		});
	})('missingModule');
});

it("should call error callback on exception thrown in loading module", function(done) {
	require.ensure(['./throwing'], function(){
		require('./throwing');
	}, function(error) {
		error.should.be.instanceOf(Error);
		error.message.should.be.eql('message');
		done();
	});
});

it("should not call error callback on exception thrown in require callback", function(done) {
	require.ensure(['./throwing'], function() {
		throw new Error('message');
	}, function(error) {
		error.should.be.instanceOf(Error);
		error.message.should.be.eql('message');
		done();
	});
});

it("should call error callback when there is an error loading the chunk", function(done) {
	var temp = __webpack_require__.e;
	__webpack_require__.e = function() { return Promise.resolve().then(function() { throw 'fake chunk load error'; }); };
	require.ensure(['./file'], function(){
		try {
			var file = require('./file');
		} catch(e) { done(e); }
	}, function(error) {
		error.should.be.eql('fake chunk load error');
		done();
	});
	__webpack_require__.e = temp;
});
