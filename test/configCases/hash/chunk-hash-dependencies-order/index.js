import fs from "fs";
import path from "path";

const order = JSON.parse(
	fs.readFileSync(path.join(__dirname, "order.json"), "utf8")
);

it("should hash a chunk after the chunks it declares as hash dependencies", () => {
	const position = (name) => order.hashed.indexOf(name);
	expect(position("b")).toBeLessThan(position("c"));
	expect(position("c")).toBeLessThan(position("a"));
	expect(position("runtime~c")).toBeLessThan(position("runtime~a"));
});

it("should keep id order between chunks no declaration relates", () => {
	expect(order.hashed.indexOf("bundle")).toBeLessThan(
		order.hashed.indexOf("c")
	);
});

it("should give the runtime template the order createHash uses", () => {
	expect(order.mismatches).toEqual([]);
	expect(order.compared).toBeGreaterThan(0);
});

it("should expose the declared dependencies of a chunk", () => {
	expect(order.dependenciesOfA).toEqual(["c"]);
});
