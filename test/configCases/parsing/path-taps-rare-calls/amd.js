// a factory with a directive: its mode is read from the body of whichever reader walks it
define(["./dir/a.js"], function (a) {
	"use strict";
	return { name: a.name };
});
