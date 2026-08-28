"use strict";

module.exports = {
	findBundle() {
		// Only the entry holding the assertions: the others exist for their emitted
		// text, and running them would fetch the binary, which Node cannot.
		return ["./main.mjs"];
	}
};
