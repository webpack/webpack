import { veryLongExportName, anotherVeryLongExportName, yetAnotherVeryLongExportName } from "./re-export";
import { renamedVeryLongExportName, anotherVeryLongExportName as anotherFromNamed } from "./named-reexport";
import { veryLongExportName as nestedVeryLong, renamedVeryLongExportName as nestedRenamed } from "./nested-reexport";

it("should mangle exports from wildcard pass-through re-exports", () => {
    expect(veryLongExportName).toBe("value1");
    expect(anotherVeryLongExportName).toBe("value2");
    expect(yetAnotherVeryLongExportName).toBe("value3");
});

it("should mangle exports from named pass-through re-exports", () => {
    expect(renamedVeryLongExportName).toBe("value1");
    expect(anotherFromNamed).toBe("value2");
});

it("should mangle exports from nested pass-through re-exports", () => {
    expect(nestedVeryLong).toBe("value1");
    expect(nestedRenamed).toBe("value1");
});
