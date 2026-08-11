import "./style.css";

it("should minify CSS the inject runtime embeds in JS", () => {
	expect(__webpack_css_server_styles__).toMatchSnapshot();
});
