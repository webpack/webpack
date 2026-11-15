"use strict";
for (var i = 0; i < 2; i++) {
	if (i === 1) exports.a = 2;
	else Object.defineProperty(exports, "a", { value: 1 });
}
