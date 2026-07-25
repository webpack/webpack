import { createRequire } from "module";

const require = createRequire(import.meta.url);

const JsonParser =
	/** @type {typeof import("../../../../lib/json/JsonParser")} */
	(require("../../../../lib/json/JsonParser.js"));

const defaultParser = new JsonParser();
const shallowParser = new JsonParser({
	exportsDepth: 1,
	namedExports: false
});
const customParser = new JsonParser({ parse: JSON.parse });

let source = "";
let sourceBuffer = Buffer.alloc(0);
/** @type {import("../../../../lib/Parser").ParserState} */
let state;
let sink = 0;

/**
 * @returns {import("../../../../lib/Parser").ParserState} parser state
 */
const createState = () =>
	/** @type {import("../../../../lib/Parser").ParserState} */ (
		/** @type {unknown} */ ({
			module: {
				buildInfo: {},
				buildMeta: {},
				dependencies: [],
				addDependency(dependency) {
					this.dependencies.push(dependency);
				}
			}
		})
	);

export default {
	name: "unit/json/JsonParser",
	setup() {
		source = JSON.stringify(
			Object.fromEntries(
				Array.from({ length: 5000 }, (_, i) => [
					`key_${i}`,
					{
						id: i,
						name: `module-${i}`,
						values: [i, i + 1, i + 2],
						nested: { enabled: i % 2 === 0 }
					}
				])
			)
		);
		sourceBuffer = Buffer.from(source);
	},
	teardown() {
		source = "";
		sourceBuffer = Buffer.alloc(0);
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "parse 5000 JSON exports",
			beforeEach() {
				state = createState();
			},
			fn() {
				defaultParser.parse(source, state);
				sink = state.module.dependencies.length;
			}
		},
		{
			name: "parse JSON buffer",
			beforeEach() {
				state = createState();
			},
			fn() {
				defaultParser.parse(sourceBuffer, state);
				sink = state.module.dependencies.length;
			}
		},
		{
			name: "parse with shallow unnamed exports",
			beforeEach() {
				state = createState();
			},
			fn() {
				shallowParser.parse(source, state);
				sink = state.module.dependencies.length;
			}
		},
		{
			name: "parse with custom JSON parser",
			beforeEach() {
				state = createState();
			},
			fn() {
				customParser.parse(source, state);
				sink = state.module.dependencies.length;
			}
		}
	]
};
