export function run() {
	if (process.env.PICK === "p0") return "took-p0";
	if (process.env.PICK === "p1") return "took-p1";
	return "took-p2";
}
