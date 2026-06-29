"use strict";

const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) throw new Error("Usage: node decode-debug-hash.js <file>");

const resolvedFile = path.resolve(file);
if (!resolvedFile.startsWith(process.cwd() + path.sep)) {
	throw new Error("Invalid file path: must be within the current working directory");
}

let content = fs.readFileSync(resolvedFile, "utf8");
content = content.replace(/debug-digest-([a-f0-9]+)/g, (match, bin) =>
	Buffer.from(bin, "hex").toString("utf8")
);

fs.writeFileSync(resolvedFile, content);
