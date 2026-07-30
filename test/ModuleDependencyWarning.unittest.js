"use strict";

const path = require("path");
const ModuleDependencyWarning = require("../lib/errors/ModuleDependencyWarning");

/**
 * @param {boolean} hideStack whether the nested error hides its stack
 * @returns {InstanceType<typeof ModuleDependencyWarning>} warning
 */
function createWarning(hideStack) {
	const nested = /** @type {Error & { hideStack?: boolean }} */ (
		new Error("Nested Message")
	);
	if (hideStack) nested.hideStack = true;
	return new ModuleDependencyWarning(
		/** @type {import("../lib/Module")} */ (
			/** @type {unknown} */ ("myModule")
		),
		nested,
		/** @type {import("../lib/Dependency").DependencyLocation} */ (
			/** @type {unknown} */ ("Location")
		)
	);
}

describe("ModuleDependencyWarning", () => {
	it("takes name, message, module and loc from the nested error", () => {
		const warning = createWarning(false);
		expect(warning).toBeInstanceOf(Error);
		expect(warning.name).toBe("ModuleDependencyWarning");
		expect(warning.message).toBe("Nested Message");
		expect(warning.module).toBe("myModule");
		expect(warning.loc).toBe("Location");
	});

	it("derives details from the frames of the nested error", () => {
		expect(createWarning(false).details).toMatch(
			path.join("test", "ModuleDependencyWarning.unittest.js:")
		);
	});

	it("prepends the hidden frames to its own stack instead", () => {
		const warning = createWarning(true);
		expect(warning.details).toBeUndefined();
		expect(warning.stack).toContain(
			"\n\nModuleDependencyWarning: Nested Message"
		);
	});

	it("has no details when there is no nested error", () => {
		const warning = new ModuleDependencyWarning(
			/** @type {import("../lib/Module")} */ (
				/** @type {unknown} */ ("myModule")
			),
			/** @type {Error} */ (/** @type {unknown} */ (undefined)),
			/** @type {import("../lib/Dependency").DependencyLocation} */ (
				/** @type {unknown} */ ("Location")
			)
		);
		expect(warning.message).toBe("");
		expect(warning.details).toBeUndefined();
	});
});
