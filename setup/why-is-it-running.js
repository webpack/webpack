const log = require("why-is-node-running");

setInterval(function() {
	log();
}, 13 * 1000 * 60).unref();
