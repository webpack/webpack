"use strict";

const fs = require("fs");

const file = process.argv[2];

let content = fs.readFileSync(file, "utf8");
content = content.replace(/debug-digest-([a-f0-9]+)/g, (match, bin) =>
	Buffer.from(bin, "hex").toString("utf8")
);

fs.writeFileSync(file, content);
