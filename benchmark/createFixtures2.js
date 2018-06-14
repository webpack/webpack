const path = require("path");
const fs = require("fs");

const fixtures = path.join(__dirname, "fixtures");

try {
	fs.mkdirSync(fixtures);
} catch (e) {
	// The directory already exists
}

function genModule(prefix, depth, asyncDepth, multiplex, r, circular) {
	const source = [];
	const isAsync = depth >= asyncDepth;
	if (!isAsync) circular.push(path.resolve(fixtures, prefix + "/index.js"));
	source.push("(function() {");
	const m = (r % multiplex) + 1;
	let sum = 1;
	let item;
	try {
		fs.mkdirSync(path.resolve(fixtures, prefix));
	} catch (e) {
		// The directory already exists
	}
	if (depth > 0) {
		for (let i = 0; i < m; i++) {
			sum += genModule(
				prefix + "/" + i,
				depth - 1,
				asyncDepth,
				multiplex,
				(r + i + depth) * m + i + depth,
				circular
			);
			source.push("require(" + JSON.stringify("./" + i) + ");");
			if (i === 0) {
				if (isAsync) source.push("}); require.ensure([], function() {");
			}
		}
		item = circular[r % circular.length];
	}
	source.push("}, " + JSON.stringify(prefix) + ");");
	if (item) source.push("require(" + JSON.stringify(item) + ");");
	source.push("module.exports = " + JSON.stringify(prefix) + ";");
	fs.writeFileSync(
		path.resolve(fixtures, prefix + "/index.js"),
		source.join("\n"),
		"utf-8"
	);
	return sum;
}

for (let i = 2; i < 14; i++) {
	const count = genModule("tree-" + i, 6, 100, i, 0, []);
	console.log("generated tree", i, count);
}

for (let i = 2; i < 14; i++) {
	const count = genModule("async-tree-" + i, 6, 1, i, 0, []);
	console.log("generated async tree", i, count);
}

const a = genModule("module-async", 7, 1, 3, 2, []);

const b = genModule("module-big-async", 5, 2, 9, 2, []);

const c = genModule("module-broad-async", 3, 3, 20, 10, []);

console.log("generated modules", a, b, c);
