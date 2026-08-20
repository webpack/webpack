"use strict";

// `trace_events` throws "Trace events are unavailable" when loaded off the main
// thread — on Node as well as Bun, so this asks the thread rather than the
// engine. Only the Bun job runs the suites in worker threads, which is why the
// Node ones never reach it.
module.exports = function supportsTraceEvents() {
	try {
		require("trace_events");
		return true;
	} catch (_err) {
		return false;
	}
};
