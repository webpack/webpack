import i, { foo } from "./won't-run-tla";

it("issue-16097: should have value imported from won't-run-tla", async () => {
	expect(i).toBe(42);
	expect(foo).toBe(undefined);
});
