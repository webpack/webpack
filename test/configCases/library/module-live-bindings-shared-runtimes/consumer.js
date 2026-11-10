import { count, total, bump } from "./shared.js";

export function run() {
	const before = [count, total];
	bump();
	return [before, [count, total]];
}
