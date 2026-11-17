"use strict";

module.exports = {
	skipFreshCompilation:
		"A fresh compiler in the same process shares the worker pool, so its own warmup and calls would change the thread counts this case asserts."
};
