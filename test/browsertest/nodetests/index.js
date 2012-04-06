require("./common").globalCheck = false;

function simple(name) {
	try {
		require("./simple/test-"+name);
	} catch(e) {
		window.test(false, "Node.js Test '"+name+"' should not fail with " + e );
	}
}

simple("assert");
simple("event-emitter-check-listener-leaks");
simple("event-emitter-modify-in-emit");
simple("event-emitter-num-args");
simple("event-emitter-remove-all-listeners");
simple("global");
simple("next-tick-doesnt-hang");
simple("next-tick-ordering2");
simple("path");
simple("querystring");
simple("sys");
simple("timers-zero-timeout");
simple("timers");
simple("url");
simple("util-format");
simple("util-inspect");
simple("util");

window.test(true, "Node.js simple tests should complete");

setTimeout(function() {
	process.emit("exit");
	window.test(true, "Node.js simple tests should complete on process exit");
}, 3000);