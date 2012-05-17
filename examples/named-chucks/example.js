var a = require("a");

require.ensure(["b"], function(require) {
	// a named chuck
	var c = require("c");
}, "my own chuck");

require.ensure(["b"], function(require) {
	// another chuck with the same name
	var d = require("d");
}, "my own chuck");

require.ensure([], function(require) {
	// the same again
}, "my own chuck");

require.ensure(["b"], function(require) {
	// chuck without name
	var d = require("d");
});