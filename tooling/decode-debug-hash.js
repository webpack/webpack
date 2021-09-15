const fs = require("fs");

const file = process.argv[2];

let content = fs.readFileSync(file, "utf-8");
content = content.replace(/debug-digest-([a-f0-9]+)/g, (match, bin) => {
	return Buffer.from(bin, "hex").toString("utf-8");
});

fs.writeFileSync(file, content);
