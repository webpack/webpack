require("./common").globalCheck = false;

require("./simple/test-assert.js");
require("./simple/test-event-emitter-check-listener-leaks.js");
require("./simple/test-event-emitter-modify-in-emit.js");
require("./simple/test-event-emitter-num-args.js");
require("./simple/test-event-emitter-remove-all-listeners.js");
require("./simple/test-global.js");
require("./simple/test-next-tick-doesnt-hang.js");
require("./simple/test-next-tick-ordering2.js");
require("./simple/test-path.js");
require("./simple/test-querystring.js");
require("./simple/test-sys.js");
require("./simple/test-timers-zero-timeout.js");
require("./simple/test-timers.js");
require("./simple/test-url.js");
require("./simple/test-util-format.js");
require("./simple/test-util-inspect.js");
require("./simple/test-util.js");

window.test(true, "Node.js simple tests should complete");

setTimeout(function() {
	process.emit("exit");
	window.test(true, "Node.js simple tests should complete on process exit");
}, 3000);