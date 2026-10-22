import { a } from "./shared";

const REASON =
	'Analyzable ESM bailout: devtool "eval" wraps the module in eval(), where import.meta does not parse';

it("should report why the shared module keeps the runtime url", () => {
	expect(String(a)).toMatch(/asset\.txt$/);
	const shared = STATS_JSON.modules.find(
		(module) => module.name === "./shared.js"
	);
	expect(shared.codeGenerated).toBe(true);
	expect(shared.optimizationBailout).toContain(REASON);
});
