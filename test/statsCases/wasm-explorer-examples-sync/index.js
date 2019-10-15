it("Q_rsqrt should work", function() {
	return import("./tests").then(t => t.run_Q_rsqrt());
});

it("testFunction should work", function() {
	return import("./tests").then(t => t.run_testFunction());
});

it("fact should work", function() {
	return import("./tests").then(t => t.run_fact());
});

it("popcnt should work", function() {
	return import("./tests").then(t => t.run_popcnt());
});

it("fast-math should work", function() {
	return import("./tests").then(t => t.run_fastMath());
});

it("duff should work", function() {
	return import("./tests").then(t => t.run_duff());
});
