import cutShort from "./cut-short.html";
import quiet from "./quiet.html";
import recoverable from "./recoverable.html";

it("should still build the pages whose parse errors it reports", () => {
	expect(recoverable).toContain("<p>a</div>");
	expect(cutShort).toContain("<p>a</p>");
	expect(quiet).toContain("<p>a</div>");
});
