import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { buffersSerializer } =
	/** @type {typeof import("../../../../lib/util/serialization")} */
	(require("../../../../lib/util/serialization.js"));

/** @type {Record<string, unknown>} */
let flatData = {};
/** @type {Record<string, unknown>} */
let sharedGraph = {};
/** @type {Buffer[]} */
let flatSerialized = [];
/** @type {Buffer[]} */
let graphSerialized = [];
let sink = 0;

/**
 * @param {unknown} value value
 * @returns {Promise<Buffer[]>} serialized buffers
 */
const serialize = async (value) =>
	/** @type {Buffer[]} */ (await buffersSerializer.serialize(value, {}));

export default {
	name: "unit/util/serialization",
	async setup() {
		flatData = Object.fromEntries(
			Array.from({ length: 5000 }, (_, i) => [
				`module-${i}`,
				{
					id: i,
					resource: `/project/src/module-${i}.js`,
					hash: `hash-${i}`,
					dependencies: [`./dependency-${i % 100}`, `package-${i % 50}`]
				}
			])
		);
		const shared = {
			buildMeta: { exportsType: "namespace", strictHarmonyModule: true },
			flags: new Set(["cacheable", "built"])
		};
		const modules = Array.from({ length: 2000 }, (_, i) => ({
			id: i,
			resource: `/project/src/module-${i}.js`,
			hash: Buffer.alloc(32, i),
			shared,
			dependencies: [i && i - 1, i > 1 && i - 2]
		}));
		sharedGraph = {
			modules,
			byId: new Map(modules.map((module) => [module.id, module])),
			shared
		};
		flatSerialized = await serialize(flatData);
		graphSerialized = await serialize(sharedGraph);
	},
	teardown() {
		flatData = {};
		sharedGraph = {};
		flatSerialized = [];
		graphSerialized = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "serialize flat module metadata",
			async fn() {
				sink = (await serialize(flatData)).length;
			}
		},
		{
			name: "deserialize flat module metadata",
			async fn() {
				const value = /** @type {Record<string, unknown>} */ (
					await buffersSerializer.deserialize(flatSerialized, {})
				);
				sink = Object.keys(value).length;
			}
		},
		{
			name: "serialize shared module graph",
			async fn() {
				sink = (await serialize(sharedGraph)).length;
			}
		},
		{
			name: "deserialize shared module graph",
			async fn() {
				const value = /** @type {{ modules: unknown[] }} */ (
					await buffersSerializer.deserialize(graphSerialized, {})
				);
				sink = value.modules.length;
			}
		}
	]
};
