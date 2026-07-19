import fs from "fs/promises";

const avgCode = `
const str = "we" + "do" + "some" + "ops";
for(const x of str.split("")) {
	if(x.charCodeAt(0) > 40) {
		console.log("omg");
	} else {
		console.log(Math.random() * 2 + 3 * 2);
	}
}

// Some comment
const value = 9;

switch(value) {
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

/**
 * @param {string} folder folder
 * @param {boolean} useRequire true when to use `require(...)`, otherwise `import ... from "..."`
 * @param {number} count count of modules
 * @param {number=} async count of async
 * @returns {Promise<void>}
 */
async function createTree(
	folder,
	useRequire = false,
	count = 50,
	async = undefined
) {
	await fs.mkdir(folder, { recursive: true });

	let remaining = count - 1;

	/**
	 * @param {string} prefix prefix
	 * @param {number} count count of modules
	 * @param {number} depth depth
	 * @returns {Promise<void>}
	 */
	async function make(prefix, count, depth) {
		if (count === 0) {
			await fs.writeFile(
				`${folder}/${prefix}.js`,
				useRequire
					? `module.exports = 1;\n${avgCode}`
					: `export default 1;\n${avgCode}`
			);
		} else {
			const list = [];

			for (let i = 0; i < count; i++) {
				if (remaining-- <= 0) break;
				const isAsync =
					typeof async !== "undefined"
						? depth >= async
						: depth <= 4 && i >= 3 && i <= 4;
				const module = `${prefix}-${i}`;

				if (isAsync) {
					list.push(
						useRequire
							? `require.ensure([], function() { const module${i} = require(${JSON.stringify(`./${module}.js`)}); });\n`
							: `const module${i} = await import(${JSON.stringify(`./${module}.js`)});\n`
					);
					list.push(`counter += module${i};\nconsole.log(counter)`);
				} else {
					list.push(
						useRequire
							? `const module${i} = require(${JSON.stringify(`./${module}.js`)});\n`
							: `import module${i} from ${JSON.stringify(`./${module}.js`)};\n`
					);
					list.push(`counter += module${i};\nconsole.log(counter)`);
				}

				await make(
					module,
					depth > 4 || count > 30 ? 0 : count + depth + i ** 2,
					depth + 1
				);
			}

			await fs.writeFile(
				`${folder}/${prefix}.js`,
				`let counter = 0;\n${list.join(
					"\n"
				)};\n${useRequire ? `module.exports = counter;\n${avgCode}` : `export default counter;\n${avgCode}`}`
			);
		}
	}

	await make("module", 2, 0);
}

export default createTree;
