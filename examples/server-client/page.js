import { log } from "./helper";

const urls = CLIENT("./client.js");
const modernUrls = CLIENT_MODERN("./client.js");

const head = [
	...urls.map(href =>
		href.endsWith(".js")
			? `<script nomodule src="${href}">`
			: href.endsWith(".css")
			? `<link href="${href}">`
			: ""
	),
	...modernUrls.map(href => `<script type="module" src="${href}">`)
].join("");

export default () => {
	log("Generating page");
	return `<html><head>${head}</head></html>`;
};
