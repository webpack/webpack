/** @type {import("../../../../").LoaderDefinition<string>} */
module.exports = function () {
	const { name, expect, usedExports } = JSON.parse(this.query.slice(1));
	return [
		`if (Math.random() < 0) require(${JSON.stringify(
			`../_helpers/testModuleLoader?${JSON.stringify(usedExports)}!`
		)});`,
		"",
		...Object.keys(expect).map((source, i) =>
			[
				`import { __usedExports as usedExports_${i} } from ${JSON.stringify(
					source
				)};`,
				`it("${name} should have the correct exports used for ${source}", () => {`,
				`expect(usedExports_${i}).toEqual(${JSON.stringify(
					Array.isArray(expect[source])
						? expect[source].concat(["__usedExports"]).sort()
						: expect[source]
				)});`,
				`});`,
				""
			].join("\n")
		)
	].join("\n");
};
