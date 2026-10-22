("use strict");

if (typeof module === "undefined") return;

with ({ value: 42 }) {
	module.exports = value;
}
