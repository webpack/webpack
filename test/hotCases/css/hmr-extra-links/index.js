import "./index.css";

const findOurLink = () => {
	const link = [...window.document.getElementsByTagName("link")].find(
		(item) =>
			item.rel === "stylesheet" &&
			item.href &&
			item.href.includes("bundle.css")
	);
	expect(link).toBeDefined();
	return link;
};

it("should not touch non-stylesheet, data:, anchor or external links during CSS HMR", (done) => {
	const head = window.document.head;

	expect(findOurLink().sheet.css).toContain("color: red;");

	const iconWithDataUrl = window.document.createElement("link");
	iconWithDataUrl.rel = "shortcut icon";
	iconWithDataUrl.href = "data:;base64,=";
	head.appendChild(iconWithDataUrl);

	const iconWithAnchor = window.document.createElement("link");
	iconWithAnchor.rel = "shortcut icon";
	iconWithAnchor.href = "#href";
	head.appendChild(iconWithAnchor);

	const iconWithoutHref = window.document.createElement("link");
	iconWithoutHref.rel = "shortcut icon";
	head.appendChild(iconWithoutHref);

	const remoteStylesheet = window.document.createElement("link");
	remoteStylesheet.rel = "stylesheet";
	remoteStylesheet.href = "http://other.example.com/foreign.css";
	head.appendChild(remoteStylesheet);

	NEXT(
		require("../../update")(done, true, () => {
			expect(findOurLink().sheet.css).toContain("color: blue;");
			expect(iconWithDataUrl.parentNode).toBe(head);
			expect(iconWithAnchor.parentNode).toBe(head);
			expect(iconWithoutHref.parentNode).toBe(head);
			expect(remoteStylesheet.parentNode).toBe(head);

			NEXT(
				require("../../update")(done, true, () => {
					expect(findOurLink().sheet.css).toContain("color: yellow;");
					expect(iconWithDataUrl.parentNode).toBe(head);
					expect(iconWithAnchor.parentNode).toBe(head);
					expect(iconWithoutHref.parentNode).toBe(head);
					expect(remoteStylesheet.parentNode).toBe(head);
					done();
				})
			);
		})
	);
});
