// ConstPlugin replaces each dead branch, which holds types the parse skipped
const log: string[] = [];

if (false) {
	const unused: number = 1
	interface Shape {}
	(function () {
		log.push("dead");
	})()
	const arrow = (value: number)
		: number => value;
} else {
	const kept: string = "kept"
	type Alias = string
	;[kept].forEach((item: Alias) => log.push(item))
	const next = (value: number)
		: number => value + 1;
	log.push(String(next(1)));
}

it("blanks types inside and beside a replaced dead branch", () => {
	expect(log).toEqual(["kept", "2"]);
});
