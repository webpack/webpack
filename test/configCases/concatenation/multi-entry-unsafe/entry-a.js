// entry-a: imports shared THEN page-a
// This path sees shared before page-a, so it would be fine alone ...
import "./shared"; // establishes shared in this entry's chunk
import { pageA } from "./page-a";

it("entry-a: shared is loaded before page-a", () => {
    expect(pageA()).toBe("shared-multi-entry:unsafe-concat");
});
