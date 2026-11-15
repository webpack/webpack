import fs from "fs";
import path from "path";

const order = JSON.parse(
	fs.readFileSync(path.join(__dirname, "order.json"), "utf8")
);

const hashedOf = (names) => order.hashed.filter((name) => names.includes(name));

it("should hash entry chunks after their declared dependencies, by id otherwise", () => {
	// a -> c -> b pulls c and b ahead of a; bundle keeps its place by id.
	expect(hashedOf(["a", "b", "bundle", "c"])).toEqual(["b", "c", "a", "bundle"]);
});

it("should hash runtime chunks after their declared dependencies", () => {
	expect(
		hashedOf(["runtime~a", "runtime~b", "runtime~bundle", "runtime~c"])
	).toEqual(["runtime~b", "runtime~bundle", "runtime~c", "runtime~a"]);
});

it("should give the runtime template the order createHash uses", () => {
	expect(order.mismatches).toEqual([]);
	expect(order.compared).toBeGreaterThan(0);
});

it("should expose the declared dependencies of a chunk", () => {
	// The CommonJS chunk format declares the runtime chunk its startup requires.
	expect(order.dependenciesOfA.sort()).toEqual(["c", "runtime~a"]);
});
