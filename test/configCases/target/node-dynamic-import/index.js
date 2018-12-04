function testCase(load, done) {
	load("two", 2, function() {
		var sync = true;
		load("one", 1, function() {
			expect(sync).toBe(false);
			load("three", 3, function() {
				var sync = true;
				load("two", 2, function() {
					expect(sync).toBe(true);
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
			.then((result) => {expect(result).toEqual(nsObj({
				default: expected
			})); callback()})
			.catch((err) => {done(err)});
	}
	testCase(load, done);
});

it("should be able to use expressions in lazy-once import", function(done) {
	function load(name, expected, callback) {
		import(/* webpackMode: "lazy-once" */ "./dir/" + name + '.js')
			.then((result) => {expect(result).toEqual(nsObj({
				default: expected
			})); callback()})
			.catch((err) => {done(err)});
	}
	testCase(load, done);
});

it("should be able to use expressions in import", function(done) {
	function load(name, expected, callback) {
		import("./dir2/" + name).then((result) => {
			expect(result).toEqual(nsObj({
				default: expected
			}));
			callback();
		}).catch((err) => {
			done(err);
		});
	}
	testCase(load, done);
});

it("should convert to function in node", function() {
	expect((typeof __webpack_require__.e)).toBe("function");
})

it("should be able to use import", function(done) {
	import("./two").then((two) => {
		expect(two).toEqual(nsObj({
			default: 2
		}));
		done();
	}).catch(function(err) {
		done(err);
	});
});
