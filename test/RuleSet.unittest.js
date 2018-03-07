"use strict";

const RuleSet = require("../lib/RuleSet");

function match(ruleSet, resource) {
	const result = ruleSet.exec({
		resource: resource
	});
	return result
		.filter(r => {
			return r.type === "use";
		})
		.map(r => r.value)
		.map(r => {
			if (!r.options) return r.loader;
			if (typeof r.options === "string") return r.loader + "?" + r.options;
			return r.loader + "?" + JSON.stringify(r.options);
		});
}

describe("RuleSet", () => {
	it("should create RuleSet with a blank array", () => {
		const loader = new RuleSet([]);
		expect(loader.rules).toEqual([]);
	});
	it("should create RuleSet and match with empty array", () => {
		const loader = new RuleSet([]);
		expect(match(loader, "something")).toEqual([]);
	});
	it("should not match with loaders array", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: "css"
			}
		]);
		expect(match(loader, "something")).toEqual([]);
	});

	it("should match with regex", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should match with string", () => {
		const loader = new RuleSet([
			{
				test: "style.css",
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should match with function", () => {
		const loader = new RuleSet([
			{
				test: function(str) {
					return str === "style.css";
				},
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should throw if invalid test", () => {
		expect(() => {
			const loader = new RuleSet([
				{
					test: {
						invalid: "test"
					},
					loader: "css"
				}
			]);
			match(loader, "style.css");
		}).toThrow(/Unexcepted property invalid in condition/);
	});

	it("should accept multiple test array that all match", () => {
		const loader = new RuleSet([
			{
				test: [/style.css/, /yle.css/],
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should accept multiple test array that not all match", () => {
		const loader = new RuleSet([
			{
				test: [/style.css/, /something.css/],
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should not match if include does not match", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				include: /output.css/,
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual([]);
	});

	it("should match if include matches", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				include: /style.css/,
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should not match if exclude matches", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				exclude: /style.css/,
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual([]);
	});

	it("should match if exclude does not match", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				exclude: /output.css/,
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should work if a loader is applied to all files", () => {
		const loader = new RuleSet([
			{
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
		expect(match(loader, "scripts.js")).toEqual(["css"]);
	});

	it("should work with using loader as string", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should work with using loader as array", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: ["css"]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should work with using loaders as string", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: "css"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should work with using loaders as array", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: ["css"]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should throw if using loaders with non-string or array", () => {
		expect(() => {
			const loader = new RuleSet([
				{
					test: /\.css$/,
					loaders: {
						someObj: true
					}
				}
			]);
			match(loader, "style.css");
		}).toThrow(/No loader specified/);
	});

	it("should work with using loader with inline query", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: "css?modules=1"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css?modules=1"]);
	});

	it("should work with using loader with string query", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: "css",
				query: "modules=1"
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css?modules=1"]);
	});

	it("should work with using loader with object query", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loader: "css",
				query: {
					modules: 1
				}
			}
		]);
		expect(match(loader, "style.css")).toEqual(['css?{"modules":1}']);
	});

	it("should work with using array loaders with basic object notation", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: [
					{
						loader: "css"
					}
				]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css"]);
	});

	it("should throw if using array loaders with object notation without specifying a loader", () => {
		expect(() => {
			const loader = new RuleSet([
				{
					test: /\.css$/,
					loaders: [
						{
							stuff: 1
						}
					]
				}
			]);
			match(loader, "style.css");
		}).toThrow(/No loader specified/);
	});

	it("should work with using array loaders with object notation", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: [
					{
						loader: "css",
						query: "modules=1"
					}
				]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["css?modules=1"]);
	});

	it("should work with using multiple array loaders with object notation", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: [
					{
						loader: "style",
						query: "filesize=1000"
					},
					{
						loader: "css",
						query: "modules=1"
					}
				]
			}
		]);
		expect(match(loader, "style.css")).toEqual([
			"style?filesize=1000",
			"css?modules=1"
		]);
	});

	it("should work with using string multiple loaders", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: "style?filesize=1000!css?modules=1"
			}
		]);
		expect(match(loader, "style.css")).toEqual([
			"style?filesize=1000",
			"css?modules=1"
		]);
	});

	it("should throw if using array loaders with a single legacy", () => {
		expect(() => {
			const loader = new RuleSet([
				{
					test: /\.css$/,
					loaders: ["style-loader", "css-loader"],
					query: "modules=1"
				}
			]);
			match(loader, "style.css");
		}).toThrow(/options\/query cannot be used with loaders/);
	});

	it("should work when using array loaders", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				loaders: ["style-loader", "css-loader"]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["style-loader", "css-loader"]);
	});

	it("should work when using an array of functions returning a loader", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				use: [
					function(data) {
						return {
							loader: "style-loader"
						};
					},
					function(data) {
						return {
							loader: "css-loader"
						};
					}
				]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["style-loader", "css-loader"]);
	});

	it("should work when using an array of either functions or strings returning a loader", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				use: [
					"style-loader",
					function(data) {
						return {
							loader: "css-loader"
						};
					}
				]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["style-loader", "css-loader"]);
	});

	it("should work when using an array of functions returning either a loader object or loader name string", () => {
		const loader = new RuleSet([
			{
				test: /\.css$/,
				use: [
					function(data) {
						return "style-loader";
					},
					function(data) {
						return {
							loader: "css-loader"
						};
					}
				]
			}
		]);
		expect(match(loader, "style.css")).toEqual(["style-loader", "css-loader"]);
	});

	it("should throw if using array loaders with invalid type", () => {
		expect(() => {
			const loader = new RuleSet([
				{
					test: /\.css$/,
					loaders: ["style-loader", "css-loader", 5]
				}
			]);
			match(loader, "style.css");
		}).toThrow(/No loader specified/);
	});

	describe("when exclude array holds an undefined item", () => {
		function errorHasContext(err) {
			return (
				/Expected condition but got falsy value/.test(err) &&
				/test/.test(err) &&
				/include/.test(err) &&
				/exclude/.test(err) &&
				/node_modules/.test(err) &&
				/undefined/.test(err)
			);
		}

		it("should throw with context", () => {
			try {
				const loader = new RuleSet([
					{
						test: /\.css$/,
						loader: "css",
						include: ["src"],
						exclude: ["node_modules", undefined]
					}
				]);
				match(loader, "style.css");
				throw new Error("unreachable");
			} catch (e) {
				expect(errorHasContext(e.message)).toBe(true);
			}
		});
		it("in resource should throw with context", () => {
			try {
				const loader = new RuleSet([
					{
						resource: {
							test: /\.css$/,
							include: ["src"],
							exclude: ["node_modules", undefined]
						}
					}
				]);
				match(loader, "style.css");
				throw new Error("unreachable");
			} catch (e) {
				expect(errorHasContext(e.message)).toBe(true);
			}
		});
		it("in issuer should throw with context", () => {
			try {
				const loader = new RuleSet([
					{
						issuer: {
							test: /\.css$/,
							include: ["src"],
							exclude: ["node_modules", undefined]
						}
					}
				]);
				match(loader, "style.css");
				throw new Error("unreachable");
			} catch (e) {
				expect(errorHasContext(e.message)).toBe(true);
			}
		});
	});
});
