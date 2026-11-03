"use strict";

module.exports = {
	skipFreshCompilation:
		"The watch compiler keeps a process-wide CPU profile open; an independent compiler would interfere with it and its events.json trace."
};
