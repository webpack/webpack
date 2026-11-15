"use strict";

// a program and a function long enough for their objects to read lazily
module.exports.source = () =>
	`import a from "b" assert { type: "json" };\nexport function f(p) {\n${"p++;\n".repeat(
		700
	)}}\nx = ${"[".repeat(300)}${"]".repeat(300)};\n`;
