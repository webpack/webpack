// Import Markdown file and convert it to HTML
import markdownToHTMLFile from "./file.md";

// Import Markdown file and get a Uint8Array
import markdownToUint8Array from "./raw-to-uint8-array.md" with { type: "bytes" };

// Import Markdown file and get a string
import markdownToString from "./raw-to-string.md";

const container = document.createElement("div");

Object.assign(container.style, {
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "left"
});
document.body.appendChild(container);

const h1 = document.createElement("h1");
h1.textContent = "Markdown examples";

container.appendChild(h1);

// To HTML

const toHtmlContainer = document.createElement("div");

Object.assign(toHtmlContainer.style, {
	flex: "1 1 100%",
	paddingBottom: "24px",
});
container.appendChild(toHtmlContainer);

const h2ToHtmlContainer = document.createElement("h2");

h2ToHtmlContainer.textContent = "Markdown to HTML";
toHtmlContainer.appendChild(h2ToHtmlContainer);

const markdownToHTMLText = document.createElement("div");
markdownToHTMLText.innerHTML = markdownToHTMLFile;

toHtmlContainer.appendChild(markdownToHTMLText);

// To Uint8Array

const toRawContainerUsingUint8Array = document.createElement("div");

Object.assign(toRawContainerUsingUint8Array.style, {
	flex: "1 1 100%",
	paddingBottom: "24px",
});
container.appendChild(toRawContainerUsingUint8Array);

const h2ToRawUsingUint8Array = document.createElement("h2");

h2ToRawUsingUint8Array.textContent = "Raw Markdown (using Uint8Array and TextDecoder)";
toRawContainerUsingUint8Array.appendChild(h2ToRawUsingUint8Array);

const markdownToRawTextUsingUint8Array = document.createElement("div");
const decoder = new TextDecoder('utf-8');
markdownToRawTextUsingUint8Array.textContent = decoder.decode(markdownToUint8Array);

toRawContainerUsingUint8Array.appendChild(markdownToRawTextUsingUint8Array);

// To string

const toRawContainerUsingString = document.createElement("div");

Object.assign(toRawContainerUsingString.style, {
	flex: "1 1 100%",
	paddingBottom: "24px",
});
container.appendChild(toRawContainerUsingString);

const h2ToRawUsingString = document.createElement("h2");

h2ToRawUsingString.textContent = "Raw Markdown (getting a string directly)";
toRawContainerUsingString.appendChild(h2ToRawUsingString);

const markdownToRawText = document.createElement("div");

markdownToRawText.textContent = markdownToString;

toRawContainerUsingString.appendChild(markdownToRawText);
