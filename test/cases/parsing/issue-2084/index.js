function runWithThis(obj, fn) {
	fn.call(obj);
}

it("should bind this context on require callback", function(done) {
	require("./file");
	runWithThis({ok: true}, function() {
		require([], function() {
			try {
				expect(require("./file")).toBe("file");
				expect(this).toEqual({ok: true});
				done();
			} catch(e) { done(e); }
		}.bind(this));
	});
});

it("should bind this context on require callback (loaded)", function(done) {
	runWithThis({ok: true}, function() {
		require(["./load.js"], function(load) {
			try {
				expect(require("./file")).toBe("file");
				expect(load).toBe("load");
				expect(this).toEqual({ok: true});
				done();
			} catch(e) { done(e); }
		}.bind(this));
	});
});

it("should bind this context on require callback (foo)", function(done) {
	var foo = {ok: true};
	require([], function(load) {
		try {
			expect(require("./file")).toBe("file");
			expect(this).toEqual({ok: true});
			done();
		} catch(e) { done(e); }
	}.bind(foo));
});

it("should bind this context on require callback (foo, loaded)", function(done) {
	var foo = {ok: true};
	require(["./load.js"], function(load) {
		try {
			expect(require("./file")).toBe("file");
			expect(load).toBe("load");
			expect(this).toEqual({ok: true});
			done();
		} catch(e) { done(e); }
	}.bind(foo));
});

it("should bind this context on require callback (foo)", function(done) {
	runWithThis({ok: true}, function() {
		require([], function(load) {
			try {
				expect(require("./file")).toBe("file");
				expect(this).toEqual({ok: {ok: true}});
				done();
			} catch(e) { done(e); }
		}.bind({ok: this}));
	});
});

it("should bind this context on require.ensure callback", function(done) {
	runWithThis({ok: true}, function() {
		require.ensure([], function(require) {
			try {
				expect(require("./file")).toBe("file");
				expect(this).toEqual({ok: true});
				done();
			} catch(e) { done(e); }
		}.bind(this));
	});
});

it("should bind this context on require.ensure callback (loaded)", function(done) {
	runWithThis({ok: true}, function() {
		require.ensure(["./load.js"], function(require) {
			try {
				expect(require("./file")).toBe("file");
				expect(this).toEqual({ok: true});
				done();
			} catch(e) { done(e); }
		}.bind(this));
	});
});
