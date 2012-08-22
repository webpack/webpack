require("./common").globalCheck = false;

function simple(name) {
	try {
		require("./simple/test-"+name);
	} catch(e) {
		window.test(false, "Node.js Test '"+name+"' should not fail with " + e );
		console.error(e.stack);
	}
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
simple("global");
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

window.test(true, "Node.js simple tests should complete");

setTimeout(function() {
	process.emit("exit");
	window.test(true, "Node.js simple tests should complete on process exit");
}, 3000);