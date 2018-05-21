try {
	const log = require("./why-is-node-running");

	setInterval(function() {
		log();
	}, 5 * 1000 * 60).unref();
} catch (e) {
	// ignore
}
