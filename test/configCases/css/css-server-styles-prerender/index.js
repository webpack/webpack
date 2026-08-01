import "./layout.css";
import { renderButton } from "./button";

const hasDocument = typeof document !== "undefined";

// Pre-render a page the way a static site generator would: build the markup,
// then inline the styles the imported stylesheets produced.
function prerender() {
	return [
		"<!doctype html>",
		`<html><head><style>${__webpack_css_server_styles__}</style></head>`,
		`<body><div class="page">${renderButton("Buy")}</div></body></html>`
	].join("");
}

it("inlines the styles of every imported stylesheet into the markup", () => {
	if (hasDocument) return;

	const html = prerender();

	expect(html).toContain('<div class="page">');
	expect(html).toContain('<button class="button">Buy</button>');
	expect(html).toContain("background: rebeccapurple");
	expect(html).toContain("max-width: 40rem");
});

it("keeps the styles out of the markup when a DOM applied them", () => {
	if (!hasDocument) return;

	expect(prerender()).toContain("<style></style>");
});
