const template = require("./template.html");
const tbody = require("./tbody.html");
const div = require("./div.html");
const document = require("./document.html");

it("should keep context-sensitive tags when parsed in a neutral `template` context", () => {
	// `as: "template"` parses the source as a `<template>`'s inner HTML, so the
	// bare `<td>` survives and its `background` URL is rewritten.
	expect(template).not.toContain('background="./cell.png"');
	expect(template).toMatch(/background="cell\.png"/);
});

it("should accept any context element (`as: \"tbody\"`)", () => {
	// A `<tbody>` context also keeps a bare `<tr><td>`.
	expect(tbody).not.toContain('background="./cell.png"');
	expect(tbody).toMatch(/background="cell\.png"/);
});

it("should respect the chosen context element — a `div` context drops the row", () => {
	// `<div>` can't contain a bare `<tr><td>`, so nothing is extracted.
	expect(div).toContain('background="./cell.png"');
});

it("should parse as a full document by default, dropping the stray row", () => {
	expect(document).toContain('background="./cell.png"');
});
