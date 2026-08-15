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
