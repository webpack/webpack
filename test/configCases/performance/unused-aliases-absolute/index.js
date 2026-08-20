import top from "./src/real/top.js";
import second from "./src/second/lazy.js";
import bare from "@bare/thing";

it("should see an absolute alias applied to a relative request", async () => {
	expect(top).toBe("other");
	expect(second).toBe("lazy");
	expect(bare).toBe("bare");
	// The async block is walked too, and a bare request names no path
	const lazy = await import("./src/other/lazy.js");
	expect(lazy.default).toBe("lazy");
});
