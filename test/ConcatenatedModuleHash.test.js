"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const ConcatenatedModule = require("../lib/optimize/ConcatenatedModule");
const createHash = require("../lib/util/createHash");

const writeFixtures = (volume, files) => {
	for (const [filePath, content] of Object.entries(files)) {
		volume.mkdirSync(path.dirname(filePath), { recursive: true });
		volume.writeFileSync(filePath, content);
	}
};

const compile = (fixtureFiles, options, callback) => {
	const inputVolume = new Volume();
	writeFixtures(inputVolume, fixtureFiles);

	const c = webpack(options);
	c.inputFileSystem = createFsFromVolume(inputVolume);
	c.outputFileSystem = createFsFromVolume(new Volume());
	c.run((err, stats) => {
		if (err) return callback(err);
		if (stats.hasErrors()) return callback(new Error(stats.toString()));
		callback(null, stats);
	});
};

const findConcatenatedModule = (compilation) => {
	for (const module of compilation.modules) {
		if (module instanceof ConcatenatedModule) return module;
	}
	return null;
};

const hashWithExternalRuntimeCondition = (
	concatenatedModule,
	compilation,
	externalModule,
	runtimeCondition
) => {
	const original = concatenatedModule._createConcatenationList;
	concatenatedModule._createConcatenationList = () => [
		{
			type: "external",
			module: externalModule,
			runtimeCondition,
			nonDeferAccess: true,
			index: 0,
			name: undefined,
			deferredName: undefined,
			deferred: false,
			deferredNamespaceObjectUsed: false,
			deferredNamespaceObjectName: undefined,
			interopNamespaceObjectUsed: false,
			interopNamespaceObjectName: undefined,
			interopNamespaceObject2Used: false
		}
	];
	try {
		const hash = createHash("xxhash64");
		concatenatedModule.updateHash(hash, {
			chunkGraph: compilation.chunkGraph,
			runtime: concatenatedModule._runtime
		});
		return /** @type {string} */ (hash.digest("hex"));
	} finally {
		concatenatedModule._createConcatenationList = original;
	}
};

describe("ConcatenatedModule hash integration", () => {
	it("changes the module hash when the runtimeCondition of an external info changes between builds", (done) => {
		const fixtures = {
			"/src/index.js":
				'import { foo } from "./lib";\nmodule.exports = foo + 1;\n',
			"/src/lib.js": 'export { foo } from "external-mod";\n'
		};

		compile(
			fixtures,
			{
				context: "/src",
				mode: "production",
				target: "node",
				entry: "./index.js",
				output: { path: "/out", filename: "main.js" },
				externals: { "external-mod": "commonjs external-mod" },
				optimization: {
					concatenateModules: true,
					minimize: false,
					usedExports: true,
					providedExports: true
				}
			},
			(err, stats) => {
				if (err) return done(err);
				const compilation = stats.compilation;
				const concatenated = findConcatenatedModule(compilation);
				expect(concatenated).not.toBeNull();

				const externalModule = [...concatenated._modules].find((m) =>
					m.identifier().startsWith("external ")
				);
				expect(externalModule).toBeDefined();

				const hashA = hashWithExternalRuntimeCondition(
					concatenated,
					compilation,
					externalModule,
					"main"
				);
				const hashB = hashWithExternalRuntimeCondition(
					concatenated,
					compilation,
					externalModule,
					"other"
				);
				const hashStable = hashWithExternalRuntimeCondition(
					concatenated,
					compilation,
					externalModule,
					"main"
				);

				expect(hashA).not.toBe(hashB);
				expect(hashA).toBe(hashStable);
				done();
			}
		);
	});
});
