import { ActionType, rootValue, Table } from "lib";

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
