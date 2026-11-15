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

// Real modules differ in shape; one repeated body under-weights classes,
// destructuring, templates and generators, which the parser walks differently.
const classCode = `
class Store {
	constructor(initial = {}) {
		this.state = { ...initial };
		this.listeners = new Set();
	}

	subscribe(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	set(key, value) {
		this.state = { ...this.state, [key]: value };
		for (const listener of this.listeners) listener(this.state);
	}

	get size() {
		return Object.keys(this.state).length;
	}

	static create(...args) {
		return new Store(...args);
	}
}

const store = Store.create({ ready: false });
const unsubscribe = store.subscribe(({ ready }) => ready && console.log(store.size));
store.set("ready", true);
unsubscribe();
`;

const dataCode = `
const items = [
	{ id: 1, name: "alpha", tags: ["a", "b"] },
	{ id: 2, name: "beta", tags: [] },
	{ id: 3, name: "gamma" }
];
const byId = items.reduce((acc, { id, ...rest }) => ({ ...acc, [id]: rest }), {});
const format = ({ name, tags = [] }) => \`\${name.toUpperCase()} (\${tags.join(", ")})\`;

async function load(id) {
	const item = byId[id];
	if (!item) throw new TypeError(\`Missing item \${id}\`);
	await Promise.resolve();
	return format(item);
}

Promise.all(items.map(({ id }) => load(id))).then((labels) => console.log(labels));
`;

const controlCode = `
function* range(start, end, step = 1) {
	for (let i = start; i < end; i += step) yield i;
}

const pattern = /^([a-z]+):\\/\\/([^/]+)/i;

function parseUrl(url) {
	const match = pattern.exec(url);
	return match ? { scheme: match[1], host: match[2] } : null;
}

outer: for (const n of range(0, 10)) {
	try {
		if (n % 3 === 0) continue;
		const parsed = parseUrl(\`https://example.com/\${n}\`);
		if (!parsed) break outer;
	} catch (error) {
		console.error(error);
	} finally {
		console.log(n);
	}
}
`;

const bodies = [avgCode, classCode, dataCode, controlCode];

const sharedCode = `
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
let nextId = 0;
const uid = (prefix = "id") => \`\${prefix}-\${nextId++}\`;
const noop = () => {};
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
	await fs.writeFile(
		`${folder}/shared.js`,
		`${sharedCode}\n${useRequire ? "module.exports = { clamp, uid, noop };" : "export { clamp, uid, noop };"}\n`
	);

	const sharedImport = useRequire
		? 'const { clamp, uid } = require("./shared.js");\n'
		: 'import { clamp, uid } from "./shared.js";\n';
	const sharedUse = "console.log(clamp(counter, 0, 100), uid());\n";
	let written = 0;

	/**
	 * @returns {string} next module body, cycling through the shapes in order
	 */
	const nextBody = () => bodies[written++ % bodies.length];

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
					? `module.exports = 1;\n${nextBody()}`
					: `export default 1;\n${nextBody()}`
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
				`${sharedImport}let counter = 0;\n${list.join(
					"\n"
				)};\n${sharedUse}${useRequire ? `module.exports = counter;\n${nextBody()}` : `export default counter;\n${nextBody()}`}`
			);
		}
	}

	await make("module", 2, 0);
}

export default createTree;
