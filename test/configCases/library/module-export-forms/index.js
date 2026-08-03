const obj = { p: "p", q: "q" };
const arr = ["r", "s"];

export const { p, q } = obj;
export const [r, s] = arr;
export const m = "m",
	n = "n";

export async function asyncFn() {
	return "async";
}
export function* genFn() {
	yield "gen";
}
export async function* asyncGenFn() {
	yield "asyncGen";
}
export default class Cls {
	value() {
		return "cls";
	}
}
export { named as renamed, other as another } from "./dep";

it("should support every declaration export form", async () => {
	expect([p, q, r, s, m, n]).toEqual(["p", "q", "r", "s", "m", "n"]);
	expect(await asyncFn()).toBe("async");
	expect(genFn().next().value).toBe("gen");
	expect((await asyncGenFn().next()).value).toBe("asyncGen");
	expect(new Cls().value()).toBe("cls");
});
