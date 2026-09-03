import { isolate } from "./isolate";
import inlineCss from "./inline.css";
import inlineHtml from "./inline.html";
import inlineJs from "./inline.js";
import inlineJson from "./inline.json";
import inlineSvg from "./inline.svg";
import modulePage from "./page-module.html";
import sheetText from "./sheet-text.css";
import sourceCss from "./source.css";
import sourceHtml from "./source.html";
import sourceJs from "./source.js";
import sourceJson from "./source.json";
import sourceSvg from "./source.svg";
import "./page-asset.html";
import "./sheet-asset.css";

// The document webpack only emits keeps every body where it was written, so it
// is the one that reaches a minimizer for each of them.
const emittedPage = readEmitted("page-asset.html");
const entryPage = readEmitted("page-entry.html");
const emittedSheet = readEmitted("main.css");

it("minifies an html document imported into javascript", () => {
	expect(modulePage).toMatchSnapshot();
});

it("minifies an html document webpack parses as an entry", () => {
	expect(entryPage).toMatchSnapshot();
});

it("minifies an html document webpack only emits", () => {
	expect(emittedPage).toMatchSnapshot();
});

it("minifies css in an html style element", () => {
	expect(
		isolate(emittedPage, /<style>\.assetStyle[^]*?<\/style>/i)
	).toMatchSnapshot();
});

it("minifies css in an html style attribute", () => {
	expect(isolate(emittedPage, /<p style=[^>]*>/i)).toMatchSnapshot();
});

it("minifies javascript in an html script element", () => {
	expect(isolate(emittedPage, /<script>var assetScript[^]*?<\/script>/i)).toMatchSnapshot();
});

it("minifies json in an html script element typed application/json", () => {
	expect(
		isolate(emittedPage, /<script type=application\/json>[^]*?<\/script>/i)
	).toMatchSnapshot();
});

it("minifies an svg subtree in html", () => {
	expect(isolate(emittedPage, /<svg viewBox[^]*?<\/svg>/i)).toMatchSnapshot();
});

it("minifies html in an html iframe srcdoc attribute", () => {
	expect(isolate(emittedPage, /<iframe srcdoc="[^"]*">/i)).toMatchSnapshot();
});

it("minifies an svg data url nested in an html style element", () => {
	expect(
		isolate(emittedPage, /url\("data:image\/svg\+xml,[^"]*"\)/i)
	).toMatchSnapshot();
});

it("extracts the script of an html entry into a chunk of its own", () => {
	expect(isolate(entryPage, /<script src=[^>]*>/i)).toMatchSnapshot();
});

it("minifies a stylesheet javascript imports as text", () => {
	expect(sheetText).toMatchSnapshot();
});

it("minifies the stylesheet webpack emits as a css asset", () => {
	expect(emittedSheet).toMatchSnapshot();
});

it("minifies css in a css data url", () => {
	expect(isolate(sheetText, /@import[^]*?\);/)).toMatchSnapshot();
});

it("minifies svg in a css data url", () => {
	expect(isolate(sheetText, /\.svg\{background:url\([^]*?\)\}/)).toMatchSnapshot();
});

it("minifies html in a css data url", () => {
	expect(isolate(sheetText, /\.html\{background:url\([^]*?\)\}/)).toMatchSnapshot();
});

it("minifies json in a css data url", () => {
	expect(isolate(sheetText, /\.json\{background:url\([^]*?\)\}/)).toMatchSnapshot();
});

it("minifies javascript in a css data url", () => {
	expect(isolate(sheetText, /\.javascript\{background:url\([^]*?\)\}/)).toMatchSnapshot();
});

it("minifies svg in a base64 css data url, and re-encodes it as base64", () => {
	const url = isolate(sheetText, /data:image\/svg\+xml;base64,[^)]*/);

	expect({ url, decoded: decodeDataUrl(url) }).toMatchSnapshot();
});

it("minifies css in a base64 css data url, and re-encodes it as base64", () => {
	const url = isolate(sheetText, /data:text\/css;base64,[^)]*/);

	expect({ url, decoded: decodeDataUrl(url) }).toMatchSnapshot();
});

it("leaves a css data url whose media type names no language", () => {
	expect(isolate(sheetText, /\.png\{background:url\([^]*?\)\}/)).toMatchSnapshot();
});

it("minifies a css module of type asset/source", () => {
	expect(sourceCss).toMatchSnapshot();
});

it("minifies an html module of type asset/source", () => {
	expect(sourceHtml).toMatchSnapshot();
});

it("minifies a javascript module of type asset/source", () => {
	expect(sourceJs).toMatchSnapshot();
});

it("minifies a json module of type asset/source", () => {
	expect(sourceJson).toMatchSnapshot();
});

it("minifies an svg module of type asset/source", () => {
	expect(sourceSvg).toMatchSnapshot();
});

it("minifies a css module of type asset/inline", () => {
	expect({
		url: inlineCss,
		decoded: decodeDataUrl(inlineCss)
	}).toMatchSnapshot();
});

it("minifies an html module of type asset/inline", () => {
	expect({
		url: inlineHtml,
		decoded: decodeDataUrl(inlineHtml)
	}).toMatchSnapshot();
});

it("minifies a javascript module of type asset/inline", () => {
	expect({ url: inlineJs, decoded: decodeDataUrl(inlineJs) }).toMatchSnapshot();
});

it("minifies a json module of type asset/inline", () => {
	expect({
		url: inlineJson,
		decoded: decodeDataUrl(inlineJson)
	}).toMatchSnapshot();
});

it("minifies an svg module of type asset/inline", () => {
	expect({
		url: inlineSvg,
		decoded: decodeDataUrl(inlineSvg)
	}).toMatchSnapshot();
});
