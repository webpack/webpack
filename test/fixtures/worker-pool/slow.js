"use strict";

const start = Date.now();

while (Date.now() - start < 100) {
	// Hold the thread so the preload is still in flight during release().
}

module.exports.value = 1;
