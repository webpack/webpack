/** @type {import("../../../../").LoaderDefinition<string>} */
module.exports = function () {
	const usedExports = JSON.parse(this.query.slice(1));
	return [
		`import { ${usedExports
			.map((/** @type {string} */ x) => `${x} as export_${x}`)
			.join(", ")} } from "./module";`,
		`export default [${usedExports.map((/** @type {string} */ x) => `export_${x}`).join(", ")}];`
	].join("\n");
};
