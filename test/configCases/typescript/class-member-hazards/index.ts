// a field without a `;` before a member whose blanked text would continue it
class Members {
	x = 1
	declare y: number
	*first() {
		yield 2;
	}
	z = 3
	private *second() {
		yield 4;
	}
	[key: string]: unknown
	["computed"] = 5
	method(): void
	method() {}
	readonly w = 6
}

it("ends each field where TypeScript does", () => {
	const members = new Members();
	expect(members.x).toBe(1);
	expect(members.z).toBe(3);
	expect(members.w).toBe(6);
	expect(members.computed).toBe(5);
	expect([...members.first()]).toEqual([2]);
	expect("y" in members).toBe(false);
});
