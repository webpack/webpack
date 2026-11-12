import { double } from "./helper";

const local = 2;

it("should build the modules a plugin analysed through webpack.javascript.syntax.scopes", () => {
	expect(double(local)).toBe(4);
});
