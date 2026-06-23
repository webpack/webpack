import { version } from "npm:canvas";
import { join } from "jsr:@std/path";
import { value } from "https://deno.land/x/foo/mod.ts";

// These specifiers use Deno's own protocols; webpack must keep them external
// (resolved by the runtime). If they were bundled, the build would fail to
// resolve them on disk, so a passing run proves they stayed external.
it("keeps Deno's protocol imports external and resolvable", () => {
	expect(version).toBe("2.0");
	expect(join("a", "b")).toBe("a/b");
	expect(value).toBe("remote");
});
