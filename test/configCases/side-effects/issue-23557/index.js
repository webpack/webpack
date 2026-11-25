import { ActionType, rootValue, Table } from "lib";
import { lateValue as directLateValue } from "lib/es/late-leaf";
import { lateRoot, lateValue } from "lib/es/late-parent";

it("keeps dependencies of an unused nested star reexport wired", () => {
	expect(Table()).toBe(42);
	expect(rootValue).toBe(1);
	expect(ActionType).toBe("action");
	const hasMissingTableAction = Object.keys(__webpack_modules__).some(
		(id) =>
			id.endsWith("/actions/table-actions.js") &&
			__webpack_modules__[id].toString().includes("webpackMissingModule")
	);
	expect(hasMissingTableAction).toBe(false);
});

it("resolves imports when a star reexport arrives after a named request", () => {
	expect(lateRoot).toBe(1);
	expect(directLateValue).toBe(42);
	expect(lateValue).toBe(42);
});
