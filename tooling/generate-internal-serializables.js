/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Generates `lib/util/internalSerializables.js` from `makeSerializable` /
 * `register(..., "webpack/lib/...")` call sites under `lib/`.
 * Run with: yarn fix:serializables
 */

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const ROOT = path.resolve(__dirname, "..");
const LIB_ROOT = path.join(ROOT, "lib");
const TARGET = path.join(LIB_ROOT, "util", "internalSerializables.js");
const REQUEST_PREFIX = "webpack/lib/";

/** @typedef {{ requirePath: string | null, source: string }} SerializableEntry */

/**
 * Filesystem-cache aliases for renamed / mistyped historical request strings.
 * @type {Record<string, string>}
 */
const LEGACY_ALIASES = {
	NodeStuffInWebError: "../errors/NodeStuffInWebError",
	RawDataUrlModule: "../asset/RawDataUrlModule",
	"dependencies/ExternalModuleConstDependency":
		"../dependencies/ExternalModuleInitFragmentDependency"
};

/**
 * Prefer these require targets over the defining file (still loads the registrar).
 * @type {Record<string, string>}
 */
const REQUIRE_OVERRIDES = {
	// RestoreProvidedData is registered in ExportsInfo under this request;
	// ModuleGraph requires ExportsInfo, matching the historical map entry.
	ModuleGraph: "../ModuleGraph"
};

/**
 * @param {string} dir directory
 * @param {string[]} out accumulator
 * @returns {string[]} absolute paths
 */
const walkJsFiles = (dir, out = []) => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) walkJsFiles(fullPath, out);
		else if (entry.name.endsWith(".js")) out.push(fullPath);
	}
	return out;
};

/**
 * @param {string} source source
 * @param {string} name call name
 * @param {(call: string) => void} onCall callback
 */
const forEachCall = (source, name, onCall) => {
	let index = 0;
	while (index < source.length) {
		const start = source.indexOf(name, index);
		if (start < 0) return;
		if (start > 0 && /[\w$]/.test(source[start - 1])) {
			index = start + name.length;
			continue;
		}
		let cursor = start + name.length;
		while (cursor < source.length && /\s/.test(source[cursor])) cursor++;
		if (source[cursor] !== "(") {
			index = cursor;
			continue;
		}
		let depth = 0;
		let end = cursor;
		for (; end < source.length; end++) {
			const char = source[end];
			if (char === "(") {
				depth++;
			} else if (char === ")") {
				depth--;
				if (depth === 0) {
					end++;
					break;
				}
			}
		}
		onCall(source.slice(start, end));
		index = end;
	}
};

/**
 * @param {string} call call source
 * @returns {string | undefined} request
 */
const extractWebpackLibRequest = (call) => {
	const match = call.match(/["'`](webpack\/lib\/[^"'`]+)["'`]/);
	return match ? match[1] : undefined;
};

/**
 * @param {string} absoluteFile file under lib/
 * @returns {string} require path relative to lib/util/
 */
const requirePathFor = (absoluteFile) => {
	const fromLib = path
		.relative(LIB_ROOT, absoluteFile)
		.split(path.sep)
		.join("/")
		.replace(/\.js$/, "");
	return `../${fromLib}`;
};

/**
 * @returns {Map<string, SerializableEntry>} key -> entry
 */
const collectEntries = () => {
	/** @type {Map<string, SerializableEntry>} */
	const entries = new Map();

	/**
	 * @param {string} request full webpack/lib request
	 * @param {string | null} requirePath require path or null for stub
	 * @param {string} source relative lib path of defining file
	 */
	const add = (request, requirePath, source) => {
		if (!request.startsWith(REQUEST_PREFIX)) return;
		const key = request.slice(REQUEST_PREFIX.length);
		const resolved =
			requirePath !== null && REQUIRE_OVERRIDES[key]
				? REQUIRE_OVERRIDES[key]
				: requirePath;
		const existing = entries.get(key);
		if (existing && existing.requirePath !== resolved) {
			throw new Error(
				`Conflicting serializable "${key}": ${existing.source} (${existing.requirePath}) vs ${source} (${resolved})`
			);
		}
		entries.set(key, { requirePath: resolved, source });
	};

	for (const absoluteFile of walkJsFiles(LIB_ROOT)) {
		const source = fs.readFileSync(absoluteFile, "utf8");
		const relative = path
			.relative(LIB_ROOT, absoluteFile)
			.split(path.sep)
			.join("/");
		const requirePath = requirePathFor(absoluteFile);

		const currentModuleMatch = source.match(
			/\bCURRENT_MODULE\s*=\s*["'`](webpack\/lib\/[^"'`]+)["'`]/
		);
		const currentModule = currentModuleMatch
			? currentModuleMatch[1]
			: undefined;

		forEachCall(source, "makeSerializable", (call) => {
			const request = extractWebpackLibRequest(call);
			if (request) add(request, requirePath, relative);
		});

		forEachCall(source, "register", (call) => {
			const request =
				extractWebpackLibRequest(call) ||
				(currentModule && /\bCURRENT_MODULE\b/.test(call)
					? currentModule
					: undefined);
			if (!request) return;
			if (relative === "util/registerExternalSerializer.js") {
				add(request, null, relative);
				return;
			}
			add(request, requirePath, relative);
		});
	}

	for (const [key, requirePath] of Object.entries(LEGACY_ALIASES)) {
		if (!entries.has(key)) {
			entries.set(key, {
				requirePath,
				source: "(legacy alias)"
			});
		}
	}

	return entries;
};

/**
 * @param {string} key map key
 * @returns {string} object key literal
 */
const formatKey = (key) =>
	/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);

/**
 * @param {Map<string, SerializableEntry>} entries entries
 * @returns {string} file source
 */
const renderFile = (entries) => {
	const keys = [...entries.keys()].sort((a, b) => {
		if (a.includes("/") !== b.includes("/")) return a.includes("/") ? -1 : 1;
		return a < b ? -1 : a > b ? 1 : 0;
	});

	const lines = keys.map((key) => {
		const entry = /** @type {SerializableEntry} */ (entries.get(key));
		if (entry.requirePath === null) {
			return `\t${formatKey(key)}: () => {\n\t\t// already registered\n\t}`;
		}
		const req = `require(${JSON.stringify(entry.requirePath)})`;
		return `\t${formatKey(key)}: () => ${req}`;
	});

	return `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// AUTO-GENERATED by tooling/generate-internal-serializables.js
// We need to include a list of requires here
// to allow webpack to be bundled with only static requires
// We could use a dynamic require(\`../\${request}\`) but this
// would include too many modules and not every tool is able
// to process this
module.exports = {
${lines.join(",\n")}
};
`;
};

/**
 * @returns {Promise<string>} prettier-formatted file contents
 */
const generateInternalSerializables = async () => {
	const rendered = renderFile(collectEntries());
	const prettierConfig = (await prettier.resolveConfig(TARGET)) || {};
	return prettier.format(rendered, {
		...prettierConfig,
		filepath: TARGET
	});
};

module.exports = {
	TARGET,
	collectEntries,
	generateInternalSerializables
};

if (require.main === module) {
	(async () => {
		const generated = await generateInternalSerializables();
		const current = fs.readFileSync(TARGET, "utf8");
		if (generated === current) {
			console.error("up to date");
			return;
		}
		fs.writeFileSync(TARGET, generated);
		console.error(`wrote ${path.relative(ROOT, TARGET)}`);
	})().catch((err) => {
		console.error(err);
		process.exitCode = 1;
	});
}
