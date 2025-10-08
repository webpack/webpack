import { veryLongExportName, anotherVeryLongExportName } from "./re-export";

it("should mangle exports from pass-through re-exports", () => {
    expect(veryLongExportName).toBe("value1");
    expect(anotherVeryLongExportName).toBe("value2");
});
