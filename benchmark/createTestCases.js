 const fs = require("fs");
const path = require("path");

// Base JavaScript code to generate
let avgJs = `
const str = "we" + "do" + "some" + "ops";
for(const x of str.split("")) {
	if(x.charCodeAt(0) > 40) {
		console.log("omg");
	} else {
		console.log(Math.random() * 2 + 3 * 2);
	}
}

// Some comment
switch(a.b.c.d.f.e.g.h.i) {
	case true:
		break;
	case "magic":
		throw new Error("Error!");
	case 9:
		(function() {
			// extra scope
			var x = 123;
			var y = 456;
			var z = x + z * x / y;
			x && y && (z = x ? y : x);
		}())
}

function a() {}
function b() {}
function c() {}
function d() {}
function e() {}
function f() {}
`;

for (let i = 0; i < 2; i++) {
	avgJs += `(function() {${avgJs}}());`;
}

// Base directory relative to the script's location
const root = __dirname;

// Create multiple module trees with varying sizes
createTree(fs, 100, path.join(root, "modules-100"));
createTree(fs, 500, path.join(root, "modules-500"));
createTree(fs, 1000, path.join(root, "modules-1000"));
createTree(fs, 3000, path.join(root, "modules-3000"));
createTree(fs, 5000, path.join(root, "modules-5000"));

/**
 * Function to generate a tree of modules with relative paths.
 * @param {Object} fs - File system module.
 * @param {number} count - Total number of modules to generate.
 * @param {string} folder - Target folder for module tree.
 */
function createTree(fs, count, folder) {
	// Ensure the folder exists
	fs.mkdirSync(folder, { recursive: true });
	let remaining = count - 1;

	function make(prefix, count, depth) {
		const filePath = path.join(folder, `${prefix}.js`);

		if (count === 0) {
			// Write leaf module file
			fs.writeFileSync(filePath, `export default 1;\n${avgJs}`, "utf-8");
		} else {
			const list = [];
			for (let i = 0; i < count; i++) {
				if (remaining-- <= 0) break;

				// Choose dynamic `import` for certain conditions
				if (depth <= 4 && i >= 3 && i <= 4) {
					list.push(
						`const module${i} = import("./${prefix}-${i}");\ncounter += module${i};`
					);
				} else {
					list.push(
						`import module${i} from "./${prefix}-${i}";\ncounter += module${i};`
					);
				}

				// Recursively generate submodules
				make(
					`${prefix}-${i}`,
					depth > 4 || count > 30 ? 0 : count + depth + Math.pow(i, 2),
					depth + 1
				);
			}

			// Write the module file
			fs.writeFileSync(
				filePath,
				`let counter = 0;\n${list.join("\n")};\nexport default counter;\n${avgJs}`,
				"utf-8"
			);
		}
	}

	// Start creating the tree from the "index" module
	make("index", 2, 0);
}
