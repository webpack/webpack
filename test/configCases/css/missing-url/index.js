import fs from "fs";
import path from "path";
import "./style.css";

it("should report a module-not-found error rather than stall code generation", () => {
	const name = fs.readdirSync(__dirname).find((f) => f.endsWith(".css"));
	expect(fs.readFileSync(path.join(__dirname, name), "utf-8")).toMatchSnapshot();
});
