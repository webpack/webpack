"use strict";

const path = require("path");
const fs = require("graceful-fs");

const webpack = require("..");

const JavascriptModulesPlugin = require("../lib/javascript/JavascriptModulesPlugin");
const ModuleFilenameHelpers = require("../lib/ModuleFilenameHelpers");

/**
 * A plugin to access module, runtimeTemplate and chunkGraph outside of .tap
 * by putting them in an object
 * @param {Object} wormhole the object that's modified. You can then access the relevant
 * properties using wormhole['property']. Example : wormhole['module']
 * @returns 
 */
let WormholePlugin = (wormhole) => ({
	apply: (compiler) => {
		compiler.hooks.compilation.tap("TestModuleFilenameHelpersPlugin", compilation => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
			hooks.renderModuleContent.tap(
				"TestModuleFilenameHelpersPlugin",
				(source, module, { runtimeTemplate, chunkGraph }) => {
					wormhole['module'] = module;
					wormhole['runtimeTemplate'] = runtimeTemplate;
					wormhole['chunkGraph'] = chunkGraph;
					wormhole['hashFunction'] = compilation.outputOptions.hashFunction;
				});
		});
	}
});

describe("ModuleFilenameHelpers", () => {
	jest.setTimeout(20000);
	let entryFile, emptyLoader;
	const wormhole = {};
	beforeAll(() => {
		entryFile = path.join(
			__dirname,
			"js",
			"ModuleFilenameHelpers",
			"index.js"
		);
		emptyLoader = path.join(
			__dirname,
			"js",
			"ModuleFilenameHelpers",
			"emptyloader.js"
		);
		try {
			fs.mkdirSync(path.join(__dirname, "js", "ModuleFilenameHelpers"), {
				recursive: true
			});
		} catch (e) {
			// empty
		}
		fs.writeFileSync(entryFile, "1", "utf-8");
		// empty loader, to test [all-loaders] and [loaders] in the template string
		fs.writeFileSync(emptyLoader, "export default function(source){return source;}");
		fs.writeFile
		const compiler = webpack({
			entry: entryFile,
			output: {
				path: path.join(__dirname, "js", "ModuleFilenameHelpers")
			},
			module: {
				rules: [
					{
						test: /\.js$/,
						use: [
							{
								loader: emptyLoader,
							},
						]
					}
				]
			},
			plugins: [WormholePlugin(wormhole)],
		});
		return new Promise((resolve, reject) => {
			compiler.run((err, stats) => {
				if (err) reject(err);
				resolve();
			})
		});
	});
	it("createFilename()", () => {
		let { chunkGraph, module, runtimeTemplate, hashFunction } = wormhole;
		const fn = (template, namespace = "") => ModuleFilenameHelpers.createFilename(
			module,
			{
				moduleFilenameTemplate: template,
				namespace
			},
			{
				requestShortener: runtimeTemplate.requestShortener,
				chunkGraph,
				hashFunction
			}
		);
		expect(fn("webpack://[namespace]", "puppies")).toBe("webpack://puppies");
		let absolutePathStr = "[absolute-resource-path]";
		let absolutePath = fn(absolutePathStr);
		expect(absolutePath.indexOf("ModuleFilenameHelpers/index.js") + "ModuleFilenameHelpers/index.js".length).toBe(absolutePath.length);
		expect(parseInt(fn("[id]"))).not.toBeNaN();
		expect(parseInt(fn("[hash]"), 16)).not.toBeNaN();
		expect(fn("[resource]")).toBe("./test/js/ModuleFilenameHelpers/index.js");
		expect(fn("[resource-path]")).toBe("./test/js/ModuleFilenameHelpers/index.js");
		expect(fn("[all-loaders]")).toBe("./test/js/ModuleFilenameHelpers/emptyloader.js");
		expect(fn("[loaders]")).toBe("");
		expect(fn("webpack://[namespace]/[resourcePath]?[all-loaders]")).toBe("webpack:///./test/js/ModuleFilenameHelpers/index.js?./test/js/ModuleFilenameHelpers/emptyloader.js")
		let keys;
		fn(info => (keys = Object.keys(info)));
		keys.sort();
		expect(keys).toEqual([
			"absoluteResourcePath",
			"allLoaders",
			"hash",
			"identifier",
			"loaders",
			"moduleId",
			"namespace",
			"query",
			"resource",
			"resourcePath",
			"shortIdentifier",
		]);
	});

	it('matchObject', () => {
		expect(ModuleFilenameHelpers.matchObject({ test: "foo.js" }, "foo.js")).toBe(true);
		expect(ModuleFilenameHelpers.matchObject({ test: /^foo/ }, "foo.js")).toBe(true);
		expect(ModuleFilenameHelpers.matchObject({ test: [/^foo/, "bar"] }, "foo.js")).toBe(true);
		expect(ModuleFilenameHelpers.matchObject({ test: [/^foo/, "bar"] }, "baz.js")).toBe(false);

		expect(ModuleFilenameHelpers.matchObject({ include: "foo.js" }, "foo.js")).toBe(true);
		expect(ModuleFilenameHelpers.matchObject({ include: "foo.js" }, "bar.js")).toBe(false);
		expect(ModuleFilenameHelpers.matchObject({ include: /^foo/ }, "foo.js")).toBe(true);
		expect(ModuleFilenameHelpers.matchObject({ include: [/^foo/, "bar"] }, "foo.js")).toBe(true);
		expect(ModuleFilenameHelpers.matchObject({ include: [/^foo/, "bar"] }, "baz.js")).toBe(false);

		expect(ModuleFilenameHelpers.matchObject({ exclude: "foo.js" }, "foo.js")).toBe(false);
		expect(ModuleFilenameHelpers.matchObject({ exclude: [/^foo/, "bar"] }, "foo.js")).toBe(false);
	});
});