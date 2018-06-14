const path = require("path");
const fs = require("fs");

const fixtures = path.join(__dirname, "fixtures");

try {
	fs.mkdirSync(fixtures);
} catch (e) {
	// The directory already exists
}

function generateRequireString(conditional, suffix) {
	const prefixedSuffix = suffix ? `.${suffix}` : "";
	return `require(${JSON.stringify(`./${conditional}${prefixedSuffix}.js`)});`;
}

for (let i = 0; i < 10000; i++) {
	const source = [];
	if (i > 8) source.push(generateRequireString((i / 8) | 0));
	if (i > 4) source.push(generateRequireString((i / 4) | 0));
	if (i > 2) source.push(generateRequireString((i / 2) | 0));
	if (i > 0) source.push(generateRequireString(i - 1));
	source.push("module.exports = " + i + ";");
	fs.writeFileSync(path.join(fixtures, i + ".js"), source.join("\n"), "utf-8");
}

for (let i = 0; i < 10000; i++) {
	const source = [];
	source.push("require.ensure([], function(require) {");
	if (i > 8) source.push(generateRequireString((i / 8) | 0, "async"));
	if (i > 4) source.push(generateRequireString((i / 4) | 0, "async"));
	if (i > 2) source.push(generateRequireString((i / 2) | 0, "async"));
	if (i > 0) source.push(generateRequireString(i - 1, "async"));
	source.push("});");
	source.push("module.exports = " + i + ";");
	fs.writeFileSync(
		path.join(fixtures, i + ".async.js"),
		source.join("\n"),
		"utf-8"
	);
}

for (let i = 0; i < 100; i++) {
	const source = [];
	if (i > 8) source.push(generateRequireString((i / 8) | 0, "big"));
	if (i > 4) source.push(generateRequireString((i / 4) | 0, "big"));
	if (i > 2) source.push(generateRequireString((i / 2) | 0, "big"));
	if (i > 0) source.push(generateRequireString(i - 1, "big"));
	for (let j = 0; j < 300; j++)
		source.push(
			"if(Math.random())hello.world();test.a.b.c.d();x(1,2,3,4);var a,b,c,d,e,f;"
		);
	source.push("module.exports = " + i + ";");
	fs.writeFileSync(
		path.join(fixtures, i + ".big.js"),
		source.join("\n"),
		"utf-8"
	);
}
