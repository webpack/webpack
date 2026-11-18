import { plain } from "./plain.js";
import { typed, load } from "./typed.js";
import { check } from "./check.js";

it("keeps both imports apart when the plain one comes first", () =>
	check(typed, plain, load));
