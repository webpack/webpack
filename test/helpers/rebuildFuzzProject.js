"use strict";

// A small project and the seeded edits made to it, for the rebuild fuzzer: an
// edit names modules, links and files by numbers taken modulo what exists, so
// any subsequence of edits still applies, which lets a failure be shrunk.

const path = require("path");
const { createRandom } = require("./jsFuzzProgram");

/** @typedef {"static" | "dynamic" | "star" | "named" | "require"} LinkKind */
/** @typedef {{ to: string, kind: LinkKind, name: string }} Link */
/** @typedef {{ kind: "json", to: string, key: string } | { kind: "loader" } | { kind: "context" }} Read */
/** @typedef {{ format: "esm" | "cjs", exports: string[], links: Link[], reads: Read[], revision: number, exists: boolean, broken: boolean, effect: boolean, dir: string }} ModuleRecord */
/** @typedef {{ revision: number, exists: boolean }} DataRecord */
/** @typedef {{ keys: string[], revision: number, exists: boolean }} JsonRecord */
/** @typedef {{ nextModule: number, modules: Map<string, ModuleRecord>, nextData: number, data: Map<string, DataRecord>, nextJson: number, json: Map<string, JsonRecord>, sideEffectsFalse: boolean, touched: string | undefined }} Project */
/** @typedef {[string, number, number, number, number]} Edit */

/** @type {LinkKind[]} */
const LINK_KINDS = ["static", "static", "dynamic", "star", "named", "require"];
const NAMES = ["a", "b", "c", "d"];
// purging a changed file clears every cached listing under its folder, so
// nothing the edits change sits at the root, which holds every other folder
const DIRS = ["app/", "app/sub/", "lib/"];
/** @type {Read["kind"][]} */
const READ_KINDS = ["json", "loader", "context"];

/**
 * @template T
 * @param {T[]} list list
 * @param {number} index any integer
 * @returns {T} the item the index names, modulo the length
 */
const pick = (list, index) =>
	list[((index % list.length) + list.length) % list.length];

/**
 * @param {string[]} exports exported names
 * @param {string} dir folder, "" for the root
 * @returns {ModuleRecord} a module with no links
 */
const createModule = (exports, dir) => ({
	format: "esm",
	exports,
	links: [],
	reads: [],
	revision: 0,
	exists: true,
	broken: false,
	effect: false,
	dir
});

/**
 * @returns {Project} `index.js → m0 → m1`, with one data file
 */
const createProject = () => {
	const m0 = createModule(["a", "b"], "app/");
	m0.links.push({ to: "m1", kind: "static", name: "a" });
	return {
		nextModule: 2,
		modules: new Map([
			["m0", m0],
			["m1", createModule(["a"], "app/sub/")]
		]),
		nextData: 1,
		data: new Map([["d0", { revision: 0, exists: true }]]),
		nextJson: 0,
		json: new Map(),
		sideEffectsFalse: false,
		touched: undefined
	};
};

/**
 * @param {Project} project project
 * @returns {Project} a copy the next step's edits change
 */
const cloneProject = (project) => ({
	...project,
	touched: undefined,
	modules: new Map(
		[...project.modules].map(([id, record]) => [
			id,
			{
				...record,
				exports: [...record.exports],
				links: record.links.map((link) => ({ ...link })),
				reads: record.reads.map((read) => ({ ...read }))
			}
		])
	),
	data: new Map([...project.data].map(([id, file]) => [id, { ...file }])),
	json: new Map(
		[...project.json].map(([id, file]) => [
			id,
			{ ...file, keys: [...file.keys] }
		])
	)
});

/**
 * @param {Project} project project
 * @param {number} index any integer
 * @returns {ModuleRecord} the module the index names
 */
const pickModule = (project, index) =>
	/** @type {ModuleRecord} */ (
		project.modules.get(pick([...project.modules.keys()], index))
	);

/**
 * @template T
 * @param {Map<string, T>} map files
 * @param {(item: T, id: string) => boolean} filter which files qualify
 * @returns {string[]} the ids of the files that qualify
 */
const idsWhere = (map, filter) =>
	[...map].filter(([id, item]) => filter(item, id)).map(([id]) => id);

/**
 * @template T
 * @param {T[]} list list, changed
 * @param {number} index any integer
 */
const removeAt = (list, index) => {
	list.splice(((index % list.length) + list.length) % list.length, 1);
};

// Each edit changes the project and returns false when it cannot apply.
/** @type {Record<string, (project: Project, ...args: number[]) => boolean | void>} */
const EDITS = {
	edit(project, m) {
		pickModule(project, m).revision++;
	},
	touch(project, m) {
		const id = pick(
			idsWhere(project.modules, (record) => record.exists),
			m
		);
		const record = /** @type {ModuleRecord} */ (project.modules.get(id));
		project.touched = `${record.dir}${id}.js`;
	},
	add(project, from, format, kind, name) {
		const id = `m${project.nextModule++}`;
		const record = createModule([pick(NAMES, name)], pick(DIRS, kind + name));
		if (format % 3 === 0) record.format = "cjs";
		const source = pickModule(project, from);
		project.modules.set(id, record);
		source.links.push({
			to: id,
			kind: pick(LINK_KINDS, kind),
			name: pick(NAMES, name)
		});
	},
	remove(project, m) {
		const ids = idsWhere(project.modules, (record, id) => id !== "m0");
		if (ids.length === 0) return false;
		const record = /** @type {ModuleRecord} */ (
			project.modules.get(pick(ids, m))
		);
		if (!record.exists) return false;
		record.exists = false;
	},
	// one target goes missing as another comes back, which a count of the
	// missing ones cannot tell apart
	swap(project, from, to) {
		const removed = idsWhere(project.modules, (record) => !record.exists);
		const present = idsWhere(
			project.modules,
			(record, id) => record.exists && id !== "m0"
		);
		if (removed.length === 0 || present.length === 0) return false;
		/** @type {ModuleRecord} */ (
			project.modules.get(pick(removed, to))
		).exists = true;
		/** @type {ModuleRecord} */ (
			project.modules.get(pick(present, from))
		).exists = false;
	},
	// what a link points at goes missing or comes back, the link unchanged
	flipTarget(project, from, index) {
		const { links } = pickModule(project, from);
		if (links.length === 0) return false;
		const target = project.modules.get(pick(links, index).to);
		if (!target || pick(links, index).to === "m0") return false;
		target.exists = !target.exists;
	},
	// two targets of one module trade places: one goes missing as one comes back
	swapTargets(project, from) {
		const { links } = pickModule(project, from);
		/** @type {ModuleRecord[]} */
		const targets = links
			.map((link) => project.modules.get(link.to))
			.filter((record) => record !== undefined);
		const present = targets.find((record) => record.exists);
		const missing = targets.find((record) => !record.exists);
		if (!present || !missing || present === missing) return false;
		present.exists = false;
		missing.exists = true;
	},
	// a link back along an existing one makes a cycle
	backLink(project, from, index, kind, name) {
		const ids = [...project.modules.keys()];
		const source = pick(ids, from);
		const { links } = pickModule(project, from);
		if (links.length === 0 || source === "m0") return false;
		const target = pick(links, index).to;
		const record = project.modules.get(target);
		if (!record || target === source) return false;
		record.links.push({
			to: source,
			kind: pick(LINK_KINDS, kind),
			name: pick(NAMES, name)
		});
	},
	restore(project, m) {
		const ids = idsWhere(project.modules, (record) => !record.exists);
		if (ids.length === 0) return false;
		/** @type {ModuleRecord} */ (project.modules.get(pick(ids, m))).exists =
			true;
	},
	link(project, from, to, kind, name) {
		const ids = [...project.modules.keys()];
		const target = pick(ids, to);
		if (target === pick(ids, from) || target === "m0") return false;
		pickModule(project, from).links.push({
			to: target,
			kind: pick(LINK_KINDS, kind),
			name: pick(NAMES, name)
		});
	},
	unlink(project, from, index) {
		const { links } = pickModule(project, from);
		if (links.length === 0) return false;
		removeAt(links, index);
	},
	retarget(project, from, index, to) {
		const ids = [...project.modules.keys()];
		const { links } = pickModule(project, from);
		const target = pick(ids, to);
		if (links.length === 0 || target === "m0" || target === pick(ids, from)) {
			return false;
		}
		pick(links, index).to = target;
	},
	changeKind(project, from, index, kind) {
		const { links } = pickModule(project, from);
		if (links.length === 0) return false;
		pick(links, index).kind = pick(LINK_KINDS, kind);
	},
	rename(project, m, index, name) {
		const { exports } = pickModule(project, m);
		const next = pick(NAMES, name);
		if (exports.includes(next)) return false;

		exports[((index % exports.length) + exports.length) % exports.length] =
			next;
	},
	addExport(project, m, name) {
		const { exports } = pickModule(project, m);
		const next = pick(NAMES, name);
		if (exports.includes(next)) return false;
		exports.push(next);
	},
	dropExport(project, m, index) {
		const { exports } = pickModule(project, m);
		if (exports.length < 2) return false;
		removeAt(exports, index);
	},
	format(project, m) {
		const ids = idsWhere(project.modules, (record, id) => id !== "m0");
		if (ids.length === 0) return false;
		const record = /** @type {ModuleRecord} */ (
			project.modules.get(pick(ids, m))
		);
		record.format = record.format === "esm" ? "cjs" : "esm";
	},
	effect(project, m) {
		const record = pickModule(project, m);
		record.effect = !record.effect;
	},
	syntax(project, m) {
		const record = pickModule(project, m);
		record.broken = !record.broken;
	},
	// moving a module changes every request that points at it
	move(project, m) {
		const ids = idsWhere(project.modules, (record, id) => id !== "m0");
		if (ids.length === 0) return false;
		const record = /** @type {ModuleRecord} */ (
			project.modules.get(pick(ids, m))
		);
		record.dir = DIRS[(DIRS.indexOf(record.dir) + 1) % DIRS.length];
	},
	dataAdd(project) {
		project.data.set(`d${project.nextData++}`, { revision: 0, exists: true });
	},
	dataEdit(project, d) {
		/** @type {DataRecord} */ (
			project.data.get(pick([...project.data.keys()], d))
		).revision++;
	},
	dataDelete(project, d) {
		const ids = idsWhere(
			project.data,
			(file, id) => file.exists && id !== "d0"
		);
		if (ids.length === 0) return false;
		/** @type {DataRecord} */ (project.data.get(pick(ids, d))).exists = false;
	},
	dataRestore(project, d) {
		const ids = idsWhere(project.data, (file) => !file.exists);
		if (ids.length === 0) return false;
		/** @type {DataRecord} */ (project.data.get(pick(ids, d))).exists = true;
	},
	jsonAdd(project, from) {
		const id = `j${project.nextJson++}`;
		project.json.set(id, { keys: ["k0"], revision: 0, exists: true });
		pickModule(project, from).reads.push({ kind: "json", to: id, key: "k0" });
	},
	jsonEdit(project, j) {
		const ids = [...project.json.keys()];
		if (ids.length === 0) return false;
		/** @type {JsonRecord} */ (project.json.get(pick(ids, j))).revision++;
	},
	jsonKey(project, j, k) {
		const ids = [...project.json.keys()];
		if (ids.length === 0) return false;
		const file = /** @type {JsonRecord} */ (project.json.get(pick(ids, j)));
		const key = `k${k % 3}`;
		if (!file.keys.includes(key)) file.keys.push(key);
		else if (file.keys.length < 2) return false;
		else file.keys = file.keys.filter((other) => other !== key);
	},
	jsonDelete(project, j) {
		const ids = idsWhere(project.json, (file) => file.exists);
		if (ids.length === 0) return false;
		/** @type {JsonRecord} */ (project.json.get(pick(ids, j))).exists = false;
	},
	jsonRestore(project, j) {
		const ids = idsWhere(project.json, (file) => !file.exists);
		if (ids.length === 0) return false;
		/** @type {JsonRecord} */ (project.json.get(pick(ids, j))).exists = true;
	},
	read(project, from, kind, j, k) {
		const record = pickModule(project, from);
		const readKind = pick(READ_KINDS, kind);
		if (readKind !== "json") {
			record.reads.push({ kind: readKind });
			return;
		}
		const ids = [...project.json.keys()];
		if (ids.length === 0) return false;
		record.reads.push({ kind: "json", to: pick(ids, j), key: `k${k % 3}` });
	},
	unread(project, from, index) {
		const { reads } = pickModule(project, from);
		if (reads.length === 0) return false;
		removeAt(reads, index);
	},
	// every module stops reading one kind, so its paths leave the watch list
	detach(project, kind) {
		const readKind = pick(READ_KINDS, kind);
		let changed = false;
		for (const record of project.modules.values()) {
			const before = record.reads.length;
			record.reads = record.reads.filter((read) => read.kind !== readKind);
			if (record.reads.length !== before) changed = true;
		}
		return changed;
	},
	sideEffects(project) {
		project.sideEffectsFalse = !project.sideEffectsFalse;
	}
};

/** @type {[string, number][]} */
const WEIGHTS = [
	["edit", 6],
	["touch", 1],
	["add", 4],
	["remove", 4],
	["restore", 4],
	["swap", 2],
	["flipTarget", 4],
	["swapTargets", 3],
	["backLink", 3],
	["link", 4],
	["unlink", 2],
	["retarget", 2],
	["changeKind", 3],
	["rename", 3],
	["addExport", 2],
	["dropExport", 1],
	["format", 2],
	["effect", 3],
	["syntax", 1],
	["move", 2],
	["dataAdd", 2],
	["dataEdit", 3],
	["dataDelete", 2],
	["dataRestore", 2],
	["jsonAdd", 2],
	["jsonEdit", 2],
	["jsonKey", 2],
	["jsonDelete", 1],
	["jsonRestore", 1],
	["read", 3],
	["unread", 1],
	["detach", 3],
	["sideEffects", 3]
];
const TOTAL_WEIGHT = WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);

/**
 * @param {number} seed seed
 * @param {number} stepCount how many steps to write
 * @returns {Edit[][]} the edits of each step, one to three per step
 */
const generateSteps = (seed, stepCount) => {
	const random = createRandom(seed);
	const integer = () => Math.floor(random() * 1000);
	/** @type {Edit[][]} */
	const steps = [];
	for (let step = 0; step < stepCount; step++) {
		/** @type {Edit[]} */
		const edits = [];
		const count = random() < 0.7 ? 1 : 1 + Math.floor(random() * 3);
		for (let i = 0; i < count; i++) {
			let left = random() * TOTAL_WEIGHT;
			let name = WEIGHTS[0][0];
			for (const [edit, weight] of WEIGHTS) {
				left -= weight;
				if (left < 0) {
					name = edit;
					break;
				}
			}
			edits.push([name, integer(), integer(), integer(), integer()]);
		}
		steps.push(edits);
	}
	return steps;
};

/**
 * @param {Project} project project, changed
 * @param {Edit} edit edit
 * @returns {boolean} whether it applied
 */
const applyEdit = (project, edit) => {
	const [name, ...args] = edit;
	return EDITS[name](project, ...args) !== false;
};

/**
 * @param {string} fromDir folder of the requesting file
 * @param {string} toPath path from the root
 * @returns {string} the relative request
 */
const relative = (fromDir, toPath) => {
	const request = path.posix.relative(fromDir || ".", toPath);
	return request.startsWith(".") ? request : `./${request}`;
};

/**
 * @param {Project} project project
 * @param {string} id module id
 * @param {ModuleRecord} record module
 * @returns {string} the module's source
 */
const renderModule = (project, id, record) => {
	/** @type {string[]} */
	const lines = [];
	/** @type {string[]} */
	const uses = [];
	const esm = record.format === "esm";
	for (const [i, link] of record.links.entries()) {
		const target = project.modules.get(link.to);
		const request = JSON.stringify(
			relative(record.dir, `${target ? target.dir : ""}${link.to}.js`)
		);
		switch (link.kind) {
			case "static":
				lines.push(
					esm
						? `import { ${link.name} as i${i} } from ${request};`
						: `const i${i} = require(${request}).${link.name};`
				);
				uses.push(`i${i}`);
				break;
			case "dynamic":
				uses.push(`() => import(${request})`);
				break;
			case "star":
				lines.push(
					esm
						? `export * from ${request};`
						: `Object.assign(exports, require(${request}));`
				);
				break;
			case "named":
				lines.push(
					esm
						? `export { ${link.name} as r${i} } from ${request};`
						: `exports.r${i} = require(${request}).${link.name};`
				);
				break;
			case "require":
				uses.push(`require(${request})`);
				break;
		}
	}
	for (const [i, read] of record.reads.entries()) {
		if (read.kind === "json") {
			const request = JSON.stringify(
				relative(record.dir, `json/${read.to}.json`)
			);
			lines.push(
				esm
					? `import j${i} from ${request};`
					: `const j${i} = require(${request});`
			);
			uses.push(`j${i}.${read.key}`);
		} else if (read.kind === "loader") {
			const request = JSON.stringify(
				`${relative(record.dir, "loader.js")}!${relative(
					record.dir,
					"stub.js"
				)}`
			);
			lines.push(
				esm
					? `import l${i} from ${request};`
					: `const l${i} = require(${request});`
			);
			uses.push(`l${i}`);
		} else {
			const request = JSON.stringify(relative(record.dir, "data"));
			lines.push(
				`const c${i} = require.context(${request}, false, /\\.txt$/);`
			);
			uses.push(`c${i}.keys().map((k) => [k, c${i}(k)])`);
		}
	}
	for (const name of record.exports) {
		const value = JSON.stringify(`${id}.${name}@${record.revision}`);
		lines.push(
			esm ? `export const ${name} = ${value};` : `exports.${name} = ${value};`
		);
	}
	lines.push(
		esm
			? `export function use() { return [${uses.join(", ")}]; }`
			: `exports.use = function () { return [${uses.join(", ")}]; };`
	);
	if (record.effect) {
		lines.push(
			`globalThis.order = (globalThis.order || []).concat(${JSON.stringify(
				id
			)});`
		);
	}
	if (record.broken) lines.push("export const = ;");
	return `${lines.join("\n")}\n`;
};

// Lists data/ through this.fs and reads every file, as a loader would; the
// object is built in name order, since the reads finish in any order.
const LOADER = `"use strict";

const path = require("path");

module.exports = function loader() {
	const callback = this.async();
	const dir = path.join(this.rootContext, "data");
	this.addContextDependency(dir);
	this.fs.readdir(dir, (err, names) => {
		if (err) return callback(null, "module.exports = null;");
		const files = names.filter((name) => name.endsWith(".txt")).sort();
		if (files.length === 0) return callback(null, "module.exports = {};");
		const contents = [];
		let left = files.length;
		files.forEach((name, i) => {
			const file = path.join(dir, name);
			this.addDependency(file);
			this.fs.readFile(file, (readError, content) => {
				contents[i] = readError ? null : String(content);
				if (--left > 0) return;
				const result = {};
				files.forEach((other, j) => (result[other] = contents[j]));
				callback(null, "module.exports = " + JSON.stringify(result) + ";");
			});
		});
	});
};
`;

/**
 * @param {Project} project project
 * @returns {Map<string, string>} path from the root to source, of every file that exists
 */
const renderFiles = (project) => {
	/** @type {Map<string, string>} */
	const files = new Map();
	for (const [id, record] of project.modules) {
		if (record.exists) {
			files.set(`${record.dir}${id}.js`, renderModule(project, id, record));
		}
	}
	files.set("loader.js", LOADER);
	files.set("stub.js", "");
	for (const [id, file] of project.data) {
		if (file.exists) files.set(`data/${id}.txt`, `${id}@${file.revision}\n`);
	}
	for (const [id, file] of project.json) {
		if (!file.exists) continue;
		const content = Object.fromEntries(
			file.keys.map((key) => [key, `${id}.${key}@${file.revision}`])
		);
		files.set(`json/${id}.json`, `${JSON.stringify(content)}\n`);
	}
	files.set(
		"package.json",
		`${JSON.stringify({
			name: "p",
			sideEffects: project.sideEffectsFalse ? false : undefined
		})}\n`
	);
	files.set(
		"index.js",
		'import * as root from "./app/m0.js";\nconsole.log(root, root.use());\n'
	);
	return files;
};

module.exports = {
	applyEdit,
	cloneProject,
	createProject,
	generateSteps,
	renderFiles
};
