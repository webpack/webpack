const fs = require("fs");
const path = require("path");
const vm = require("vm");

const outputPath = __STATS__.children[__STATS_I__].outputPath;

const read = (file) => fs.readFileSync(path.join(outputPath, file), "utf-8");

// Every chunk shares one global, the way a page loading them all would.
const wrap = (context, file, argument) =>
	vm.runInContext(
		`(function(${argument}) {\n${read(file)}\n})`,
		context,
		{ filename: file }
	);

// Loaders small enough to read, but faithful about the one thing under test: a chunk
// runs only after the chunks its own dependency list names.
const amdRequire = (entry) => {
	const context = vm.createContext({});
	const loaded = new Map();
	const load = (id) => {
		if (loaded.has(id)) return loaded.get(id);
		let exports;
		const define = (...args) => {
			const factory = args.pop();
			const dependencies = Array.isArray(args[args.length - 1])
				? args.pop()
				: [];
			exports = factory(...dependencies.map((d) => load(d.slice(2))));
		};
		define.amd = {};
		wrap(context, `${id}.js`, "define")(define);
		loaded.set(id, exports);
		return exports;
	};
	return load(entry);
};

const systemImport = (entry) => {
	const context = vm.createContext({});
	const loaded = new Map();
	const load = (id) => {
		if (loaded.has(id)) return loaded.get(id);
		let declare;
		let dependencies;
		wrap(context, id, "System")({
			register: (...args) => {
				declare = args.pop();
				dependencies = args.pop();
			}
		});
		const exports = {};
		loaded.set(id, exports);
		const registration = declare((name, value) => {
			if (typeof name === "object") Object.assign(exports, name);
			else exports[name] = value;
			return value;
		}, {});
		for (const [i, dependency] of dependencies.entries()) {
			const value = load(dependency.slice(2));
			if (registration.setters) registration.setters[i](value);
		}
		registration.execute();
		return exports;
	};
	return load(entry);
};

const system = __STATS_I__ === 2;

it("should load the chunks a dependOn entry names, and nothing else", () => {
	const leaf = system ? systemImport("leaf.js") : amdRequire("leaf");

	expect(leaf.leaf).toBe("leaf+middle+shared");
});

it("should name the chunks the entry needs in its dependency list", () => {
	const dependencies = read("middle.js").match(
		system ? /System\.register\((\[.*?\])/ : /define\((?:"[^"]*", )?(\[.*?\])/
	);

	expect(JSON.parse(dependencies[1].replace(/'/g, '"'))).toEqual([
		system ? "./shared.js" : "./shared"
	]);
});
