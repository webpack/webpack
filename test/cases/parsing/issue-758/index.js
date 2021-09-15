it("should require existing module with supplied error callback", function(done) {
	require.ensure(['./file'], function(){
		try {
			var file = require('./file');
			expect(file).toBe("file");
			done();
		} catch(e) { done(e); }
	}, function(error) {});
});

it("should call error callback on missing module", function(done) {
	require.ensure(['./missingModule'], function(){
		require('./missingModule');
	}, function(error) {
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe("Cannot find module './missingModule'");
		done();
	});
});

it("should call error callback on missing module in context", function(done) {
	(function(module) {
		require.ensure([], function(){
			require('./' + module);
		}, function(error) {
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe("Cannot find module './missingModule'");
			done();
		});
	})('missingModule');
});

it("should call error callback on exception thrown in loading module", function(done) {
	require.ensure(['./throwing'], function(){
		require('./throwing');
	}, function(error) {
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('message');
		done();
	});
});

it("should not call error callback on exception thrown in require callback", function(done) {
	require.ensure(['./throwing'], function() {
		throw new Error('message');
	}, function(error) {
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('message');
		done();
	});
});

it("should call error callback when there is an error loading the chunk", function(done) {
	var temp = __webpack_chunk_load__;
	__webpack_chunk_load__ = function() { return Promise.resolve().then(function() { throw 'fake chunk load error'; }); };
	require.ensure(['./file'], function(){
		try {
			var file = require('./file');
		} catch(e) { done(e); }
	}, function(error) {
		expect(error).toBe('fake chunk load error');
		done();
	});
	__webpack_chunk_load__ = temp;
});
