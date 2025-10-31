import fs from "fs";
import "./style.css";
import "./dependency.js";

it("The dependOn chunk must be loaded before the common chunk.", () => {
	const source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatchSnapshot();
});