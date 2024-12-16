 const path = require("path");
const fs = require("fs");

// Define the fixtures directory relative to the current script
const fixtures = path.resolve(__dirname, "fixtures");

// Ensure the fixtures directory exists
try {
	fs.mkdirSync(fixtures, { recursive: true }); // Use `recursive: true` for nested directories
} catch (e) {
	// Ignore if the directory already exists
	if (e.code !== "EEXIST") {
		throw e;
	}
}

// Function to generate module files with proper relative paths
function genModule(prefix, depth, asyncDepth, multiplex, r, circular) {
	const source = [];
	const isAsync = depth >= asyncDepth;

	// Track circular dependencies for synchronous modules
	if (!isAsync) circular.push(path.resolve(fixtures, prefix, "index.js"));

	source.push("(function() {");
	const m = (r % multiplex) + 1;
	let sum = 1;
	let circularItem;

	// Create the directory for the current module
	try {
		fs.mkdirSync(path.resolve(fixtures, prefix), { recursive: true });
	} catch (e) {
		// Ignore if the directory already exists
		if (e.code !== "EEXIST") {
			throw e;
		}
	}

	// Generate submodules recursively
	if (depth > 0) {
		for (let i = 0; i < m; i++) {
			sum += genModule(
				path.join(prefix, i.toString()), // Use `path.join` for platform-agnostic paths
				depth - 1,
				asyncDepth,
				multiplex,
				(r + i + depth) * m + i + depth,
				circular
			);
			source.push(`require(${JSON.stringify("./" + i)});`);
			if (i === 0 && isAsync) {
				source.push("}); require.ensure([], function() {");
			}
		}
		// Add a circular dependency if applicable
		circularItem = circular[r % circular.length];
	}

	source.push("}, " + JSON.stringify(prefix) + ");");
	if (circularItem) source.push(`require(${JSON.stringify(circularItem)});`);
	source.push(`module.exports = ${JSON.stringify(prefix)};`);

	// Write the module file
	fs.writeFileSync(
		path.resolve(fixtures, prefix, "index.js"),
		source.join("\n"),
		"utf-8"
	);

	return sum;
}

// Generate trees with varying configurations
for (let i = 2; i < 14; i++) {
	const count = genModule(`tree-${i}`, 6, 100, i, 0, []);
	console.log("Generated tree", i, count);
}

for (let i = 2; i < 14; i++) {
	const count = genModule(`async-tree-${i}`, 6, 1, i, 0, []);
	console.log("Generated async tree", i, count);
}

// Generate specific module structures
const a = genModule("module-async", 7, 1, 3, 2, []);
const b = genModule("module-big-async", 5, 2, 9, 2, []);
const c = genModule("module-broad-async", 3, 3, 20, 10, []);

console.log("Generated modules", a, b, c);
