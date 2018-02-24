function testCase(load, done) {
	load("two", 2, function() {
		var sync = true;
		load("one", 1, function() {
			sync.should.be.eql(false);
			load("three", 3, function() {
				var sync = true;
				load("two", 2, function() {
					sync.should.be.eql(true);
					done();
				});
				Promise.resolve().then(function() {}).then(function() {}).then(function() {
					sync = false;
				});
			});
		});
		Promise.resolve().then(function() {
			sync = false;
		});
	});
}

it("should be able to use expressions in import", function(done) {
	function load(name, expected, callback) {
		import("./dir/" + name + '.js')
			.then((result) => {result.should.be.eql({ default: expected }); callback()})
			.catch((err) => {done(err)});
	}
	testCase(load, done);
});

it("should be able to use expressions in lazy-once import", function(done) {
	function load(name, expected, callback) {
		import(/* webpackMode: "lazy-once" */ "./dir/" + name + '.js')
			.then((result) => {result.should.be.eql({ default: expected }); callback()})
			.catch((err) => {done(err)});
	}
	testCase(load, done);
});

it("should be able to use expressions in import", function(done) {
	function load(name, expected, callback) {
		import("./dir2/" + name).then((result) => {
			result.should.be.eql({ default: expected });
			callback();
		}).catch((err) => {
			done(err);
		});
	}
	testCase(load, done);
});

it("should convert to function in node", function() {
	(typeof __webpack_require__.e).should.be.eql("function");
})

it("should be able to use import", function(done) {
	import("./two").then((two) => {
		two.should.be.eql({ default: 2 });
		done();
	}).catch(function(err) {
		done(err);
	});
});
