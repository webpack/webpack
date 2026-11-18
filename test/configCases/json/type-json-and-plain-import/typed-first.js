import { typed, load } from "./typed.js";
import { plain } from "./plain.js";
import { check } from "./check.js";

it("keeps both imports apart when the typed one comes first", () =>
	check(typed, plain, load));
