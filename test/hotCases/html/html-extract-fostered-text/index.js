import "./page.html";

it("should patch a body whose text the parser moves out of a table once", (done) => {
	document.body.innerHTML = "<table>version 1<tr><td>cell</td></tr></table>";

	NEXT(
		require("../../update")(done, true, () => {
			const fresh = document.createElement("div");
			fresh.innerHTML = "<table>version 2<tr><td>cell</td></tr></table>";
			expect(document.body.innerHTML.trim()).toBe(fresh.innerHTML);
			done();
		})
	);
});
