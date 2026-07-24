import { createRequire } from "module";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const BasicEffectRulePlugin =
	/** @type {typeof import("../../../../lib/rules/BasicEffectRulePlugin")} */
	(require("../../../../lib/rules/BasicEffectRulePlugin.js"));
const BasicMatcherRulePlugin =
	/** @type {typeof import("../../../../lib/rules/BasicMatcherRulePlugin")} */
	(require("../../../../lib/rules/BasicMatcherRulePlugin.js"));
const RuleSetCompiler =
	/** @type {typeof import("../../../../lib/rules/RuleSetCompiler")} */
	(require("../../../../lib/rules/RuleSetCompiler.js"));
const UseEffectRulePlugin =
	/** @type {typeof import("../../../../lib/rules/UseEffectRulePlugin")} */
	(require("../../../../lib/rules/UseEffectRulePlugin.js"));

// The subset of NormalModuleFactory's compiler wiring these rules exercise.
const ruleSetCompiler = new RuleSetCompiler([
	new BasicMatcherRulePlugin("test", "resource"),
	new BasicMatcherRulePlugin("include", "resource"),
	new BasicMatcherRulePlugin("exclude", "resource", true),
	new BasicMatcherRulePlugin("resource"),
	new BasicMatcherRulePlugin("resourceQuery"),
	new BasicMatcherRulePlugin("issuer"),
	new BasicEffectRulePlugin("type"),
	new BasicEffectRulePlugin("sideEffects"),
	new UseEffectRulePlugin()
]);

/**
 * @returns {import("../../../../lib/rules/RuleSetCompiler").RuleSetRules} a realistic module.rules array
 */
function createRules() {
	/** @type {import("../../../../lib/rules/RuleSetCompiler").RuleSetRules} */
	const rules = [];
	for (let i = 0; i < 20; i++) {
		rules.push(
			{
				test: new RegExp(`\\.ext${i}\\.js$`),
				exclude: /node_modules/,
				use: [`loader-a-${i}`, { loader: `loader-b-${i}`, options: { i } }]
			},
			{
				test: /\.css$/,
				resourceQuery: new RegExp(`variant=${i}`),
				oneOf: [
					{ resourceQuery: /raw/, type: "asset/source" },
					{ use: [`css-loader-${i}`] }
				]
			},
			{
				include: `/project/src/area-${i}`,
				sideEffects: false,
				use: [`side-effect-loader-${i}`]
			}
		);
	}
	return rules;
}

/** @type {import("../../../../lib/rules/RuleSetCompiler").RuleSet} */
let ruleSet = ruleSetCompiler.compile([]);
/** @type {{ resource: string, realResource: string, resourceQuery: string, resourceFragment: string, issuer: string, compiler: string, issuerLayer: string }[]} */
let requests = [];
let sink = 0;

export default defineSuite({
	name: "unit/rules/RuleSetCompiler",
	setup() {
		ruleSet = ruleSetCompiler.compile([{ rules: createRules() }]);
		requests = [];
		for (let i = 0; i < 500; i++) {
			const resource =
				i % 3 === 0
					? `/project/src/area-${i % 25}/file-${i}.ext${i % 20}.js`
					: i % 3 === 1
						? `/project/src/styles/style-${i}.css`
						: `/project/node_modules/pkg-${i % 30}/index.js`;
			requests.push({
				resource,
				realResource: resource,
				resourceQuery: i % 4 === 0 ? `?variant=${i % 20}` : "",
				resourceFragment: "",
				issuer: `/project/src/index-${i % 5}.js`,
				compiler: "",
				issuerLayer: ""
			});
		}
	},
	teardown() {
		requests = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "compile 60 rules",
			fn() {
				sink = ruleSetCompiler.compile([{ rules: createRules() }]).references
					.size;
			}
		},
		{
			name: "exec 500 requests against 60 rules",
			fn() {
				let effects = 0;
				for (const data of requests) {
					effects += ruleSet.exec(
						/** @type {import("../../../../lib/rules/RuleSetCompiler").EffectData} */ (
							data
						)
					).length;
				}
				sink = effects;
			}
		}
	]
});
