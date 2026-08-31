import { present } from "./reexport.js";

// a re-export is checked through the same linking path as an import
it("should report an absent name a re-export names", () => {
	expect(present).toBe(1);
});
