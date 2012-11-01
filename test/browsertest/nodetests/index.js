function simple(name, cleanup) {
	it("should pass the " + name + " test", function(done) {
		require.ensure([], function(require) {
			require("./common").globalCheck = false;
			require("./simple/test-"+name);
			if(cleanup) cleanup();
			done();
		});
	});
}

simple("assert");
simple("event-emitter-add-listeners");
simple("event-emitter-check-listener-leaks");
simple("event-emitter-max-listeners");
simple("event-emitter-modify-in-emit");
simple("event-emitter-num-args");
simple("event-emitter-once");
simple("event-emitter-remove-all-listeners");
simple("event-emitter-remove-listeners");
simple("global", function() {
	delete window.baseFoo;
	delete window.baseBar;
	delete window.foo;
	delete window.bar;
});
simple("next-tick-doesnt-hang");
simple("next-tick-ordering2");
simple("path");
simple("punycode");
simple("querystring");
simple("sys");
simple("timers");
simple("timers-zero-timeout");
simple("url");
simple("util");
simple("util-format");
simple("util-inspect");

it("should not throw exceptions on process exit", function(done) {
	require.ensure([], function(require) {
		process.emit("exit");
		done();
	});
});