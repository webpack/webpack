import exact from "@alias/exact";
import nested from "@alias/dir/leaf";

it("should stay quiet when every alias matched", () => {
	expect(exact).toBe("exact");
	expect(nested).toBe("leaf");
});
