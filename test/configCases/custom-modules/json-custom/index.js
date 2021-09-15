import toml from "../_files/data.toml";

it("should transform toml to json", () => {
	expect(toml).toMatchSnapshot();
});
