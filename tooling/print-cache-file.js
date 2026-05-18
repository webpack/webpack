"use strict";

const fs = require("fs");
const path = require("path");
const { createFileSerializer } = require("../lib/util/serialization");

const filename = process.argv[2];

if (!filename) {
	throw new Error("Usage: node tooling/print-cache-file.js <cache-file>");
}

(async () => {
	const fileStore = createFileSerializer(fs, "sha256");

	const value = await fileStore.deserialize(null, {
		filename: path.resolve(filename)
	});
	console.dir(value, { depth: 10 });
})();
