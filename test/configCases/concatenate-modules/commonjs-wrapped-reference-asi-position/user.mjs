// strict ESM: each reference below resolves to the wrapper accessor call and
// opens a statement ASI would otherwise glue to the one above it
import thing from "./thing.cjs";
import { named } from "./thing.cjs";
import * as namespace from "./thing.cjs";

export function shapes() {
	const seen = []
	seen.push("start")
	thing
	named()
	namespace.named()
	seen.push("end")
	return seen
}
