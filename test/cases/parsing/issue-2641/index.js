it("should require existing module with supplied error callback", function(done) {
	require(['./file'], function(file){
		expect(file).toEqual("file");
		done();
	}, function(error) {});
});

it("should call error callback on missing module", function(done) {
	require(['./file', './missingModule'], function(file){}, function(error) {
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toEqual('Cannot find module "./missingModule"');
		done();
	});
});

it("should call error callback on missing module in context", function(done) {
	(function(module) {
		require(['./' + module], function(file){}, function(error) {
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toEqual("Cannot find module './missingModule'.");
			done();
		});
	})('missingModule');
});

it("should call error callback on exception thrown in loading module", function(done) {
	require(['./throwing'], function(){}, function(error) {
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toEqual('message');
		done();
	});
});

it("should not call error callback on exception thrown in require callback", function(done) {
	require(['./throwing'], function() {
		throw new Error('message');
	}, function(error) {
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toEqual('message');
		done();
	});
});
