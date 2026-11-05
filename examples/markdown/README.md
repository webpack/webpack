# Markdown examples

This example demonstrates how to use Markdown files, convert (transform) them to HTML, or import them as is.

Configuration example:

```javascript
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const markdownToHtml = unified()
	.use(remarkParse)
	.use(remarkFrontmatter)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeSanitize)
	.use(rehypeStringify);

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			// To convert Markdown syntax to HTML: webpack's built-in HTML support
			// parses the converted markup, so images and other URLs it references
			// are bundled and rewritten — no `html-loader` needed
			{
				test: /\.(md|markdown|mdown|mkdn|mkd|mdwn|mkdown|ron)$/i,
				exclude: /(raw-to-string|raw-to-uint8-array)\.md/,
				type: "html",
				parser: {
					/**
					 * Runs before the HTML is parsed for dependencies
					 * @param {string} source the Markdown source
					 * @returns {string} the HTML it converts to
					 */
					template: (source) => String(markdownToHtml.processSync(source)),
					// The result is a fragment, not a full document
					as: "template"
				},
				generator: {
					// Export the HTML as a string instead of emitting a page
					extract: false
				}
			},
			// Import Markdown as a string
			{
				test: /raw-to-string\.md$/,
				type: "asset/source"
			}
		]
	}
};

export default config;
```

Code example:

```javascript
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
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 7
/*!*******************************!*\
  !*** ./raw-to-uint8-array.md ***!
  \*******************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.*, __webpack_require__.tb, module */
(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__.tb("IyBFeGFtcGxlIGhlYWRpbmdzCgojIyBTYW1wbGUgU2VjdGlvbgoKIyMgVGhpcydsbCBiZSBhIF9IZWxwZnVsXyBTZWN0aW9uIEFib3V0IHRoZSBHcmVlayBMZXR0ZXIgzpghCgpBIGhlYWRpbmcgY29udGFpbmluZyBjaGFyYWN0ZXJzIG5vdCBhbGxvd2VkIGluIGZyYWdtZW50cywgVVRGLTggY2hhcmFjdGVycywgdHdvIGNvbnNlY3V0aXZlIHNwYWNlcyBiZXR3ZWVuIHRoZSBmaXJzdCBhbmQgc2Vjb25kIHdvcmRzLCBhbmQgZm9ybWF0dGluZy4KCiMjIFRoaXMgaGVhZGluZyBpcyBub3QgdW5pcXVlIGluIHRoZSBmaWxlCgpURVhUIDEKCiMjIFRoaXMgaGVhZGluZyBpcyBub3QgdW5pcXVlIGluIHRoZSBmaWxlCgpURVhUIDIK");

/***/ },

/***/ 8
/*!**************************!*\
  !*** ./raw-to-string.md ***!
  \**************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
(module) {

module.exports = "# Example headings\n\n## Sample Section\n\n## This'll be a _Helpful_ Section About the Greek Letter Θ!\n\nA heading containing characters not allowed in fragments, UTF-8 characters, two consecutive spaces between the first and second words, and formatting.\n\n## This heading is not unique in the file\n\nTEXT 1\n\n## This heading is not unique in the file\n\nTEXT 2\n";

/***/ },

/***/ 1
/*!*****************!*\
  !*** ./file.md ***!
  \*****************/
/*! default exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
(module) {

module.exports = "<h1>Headers</h1>\n<h1>h1 Heading 8-)</h1>\n<h2>h2 Heading</h2>\n<h3>h3 Heading</h3>\n<h4>h4 Heading</h4>\n<h5>h5 Heading</h5>\n<h6>h6 Heading</h6>\n<p>Alternatively, for H1 and H2, an underline-ish style:</p>\n<h1>Alt-H1</h1>\n<h2>Alt-H2</h2>\n<hr>\n<h1>Emphasis</h1>\n<p>Emphasis, aka italics, with <em>asterisks</em> or <em>underscores</em>.</p>\n<p>Strong emphasis, aka bold, with <strong>asterisks</strong> or <strong>underscores</strong>.</p>\n<p>Combined emphasis with <strong>asterisks and <em>underscores</em></strong>.</p>\n<p>Strikethrough uses two tildes. <del>Scratch this.</del></p>\n<p><strong>This is bold text</strong></p>\n<p><strong>This is bold text</strong></p>\n<p><em>This is italic text</em></p>\n<p><em>This is italic text</em></p>\n<p><del>Strikethrough</del></p>\n<hr>\n<h1>Lists</h1>\n<ol>\n<li>First ordered list item</li>\n<li>Another item\n⋅⋅* Unordered sub-list.</li>\n<li>Actual numbers don't matter, just that it's a number\n⋅⋅1. Ordered sub-list</li>\n<li>And another item.</li>\n</ol>\n<p>⋅⋅⋅You can have properly indented paragraphs within list items. Notice the blank line above, and the leading spaces (at least one, but we'll use three here to also align the raw Markdown).</p>\n<p>⋅⋅⋅To have a line break without a paragraph, you will need to use two trailing spaces.⋅⋅\n⋅⋅⋅Note that this line is separate, but within the same paragraph.⋅⋅\n⋅⋅⋅(This is contrary to the typical GFM line break behaviour, where trailing spaces are not required.)</p>\n<ul>\n<li>Unordered list can use asterisks</li>\n</ul>\n<ul>\n<li>Or minuses</li>\n</ul>\n<ul>\n<li>Or pluses</li>\n</ul>\n<ol>\n<li>Make my changes\n<ol>\n<li>Fix bug</li>\n<li>Improve formatting\n<ul>\n<li>Make the headings bigger</li>\n</ul>\n</li>\n</ol>\n</li>\n<li>Push my commits to GitHub</li>\n<li>Open a pull request\n<ul>\n<li>Describe my changes</li>\n<li>Mention all the members of my team\n<ul>\n<li>Ask for feedback</li>\n</ul>\n</li>\n</ul>\n</li>\n</ol>\n<ul>\n<li>Create a list by starting a line with <code>+</code>, <code>-</code>, or <code>*</code></li>\n<li>Sub-lists are made by indenting 2 spaces:\n<ul>\n<li>Marker character change forces new list start:\n<ul>\n<li>Ac tristique libero volutpat at</li>\n</ul>\n<ul>\n<li>Facilisis in pretium nisl aliquet</li>\n</ul>\n<ul>\n<li>Nulla volutpat aliquam velit</li>\n</ul>\n</li>\n</ul>\n</li>\n<li>Very easy!</li>\n</ul>\n<hr>\n<h1>Task lists</h1>\n<ul class=\"contains-task-list\">\n<li class=\"task-list-item\"><input type=\"checkbox\" checked disabled> Finish my changes</li>\n<li class=\"task-list-item\"><input type=\"checkbox\" disabled> Push my commits to GitHub</li>\n<li class=\"task-list-item\"><input type=\"checkbox\" disabled> Open a pull request</li>\n<li class=\"task-list-item\"><input type=\"checkbox\" checked disabled> @mentions, #refs, <a href=\"\">links</a>, <strong>formatting</strong>, and tags supported</li>\n<li class=\"task-list-item\"><input type=\"checkbox\" checked disabled> list syntax required (any unordered or ordered list supported)</li>\n<li class=\"task-list-item\"><input type=\"checkbox\" disabled> this is a complete item</li>\n<li class=\"task-list-item\"><input type=\"checkbox\" disabled> this is an incomplete item</li>\n</ul>\n<hr>\n<h1>Ignoring Markdown formatting</h1>\n<p>You can tell GitHub to ignore (or escape) Markdown formatting by using \\ before the Markdown character.</p>\n<p>Let's rename *our-new-project* to *our-old-project*.</p>\n<hr>\n<h1>Links</h1>\n<p><a href=\"https://www.google.com\">I'm an inline-style link</a></p>\n<p><a href=\"https://www.google.com\" title=\"Google&#x27;s Homepage\">I'm an inline-style link with title</a></p>\n<p><a href=\"https://www.mozilla.org\">I'm a reference-style link</a></p>\n<p><a href=\"../blob/master/LICENSE\">I'm a relative reference to a repository file</a></p>\n<p><a href=\"http://slashdot.org\">You can use numbers for reference-style link definitions</a></p>\n<p>Or leave it empty and use the <a href=\"http://www.reddit.com\">link text itself</a>.</p>\n<p>URLs and URLs in angle brackets will automatically get turned into links.\n<a href=\"http://www.example.com\">http://www.example.com</a> or <a href=\"http://www.example.com\">http://www.example.com</a> and sometimes\nexample.com (but not on Github, for example).</p>\n<p>Some text to show that the reference links can follow later.</p>\n<hr>\n<h1>Images</h1>\n<p>Here's our logo (hover to see the title text):</p>\n<p>Inline-style:\n<img src=\"https://webpack.js.org/assets/icon-square-big.svg\" alt=\"alt text\" title=\"Logo Title Text 1\"></p>\n<p>Reference-style:\n<img src=\"https://webpack.js.org/assets/icon-square-big.svg\" alt=\"alt text\" title=\"Logo Title Text 2\"></p>\n<p><img src=\"https://octodex.github.com/images/minion.png\" alt=\"Minion\">\n<img src=\"https://octodex.github.com/images/stormtroopocat.jpg\" alt=\"Stormtroopocat\" title=\"The Stormtroopocat\"></p>\n<p>Like links, Images also have a footnote style syntax</p>\n<p><img src=\"https://octodex.github.com/images/dojocat.jpg\" alt=\"Alt text\" title=\"The Dojocat\"></p>\n<p>With a reference later in the document defining the URL location:</p>\n<hr>\n<h1><a href=\"https://github.com/markdown-it/markdown-it-footnote\">Footnotes</a></h1>\n<p>Footnote 1 link<sup><a href=\"#user-content-fn-first\" id=\"user-content-user-content-fnref-first\" data-footnote-ref aria-describedby=\"user-content-footnote-label\">1</a></sup>.</p>\n<p>Footnote 2 link<sup><a href=\"#user-content-fn-second\" id=\"user-content-user-content-fnref-second\" data-footnote-ref aria-describedby=\"user-content-footnote-label\">2</a></sup>.</p>\n<p>Inline footnote^[Text of inline footnote] definition.</p>\n<p>Duplicated footnote reference<sup><a href=\"#user-content-fn-second\" id=\"user-content-user-content-fnref-second-2\" data-footnote-ref aria-describedby=\"user-content-footnote-label\">2</a></sup>.</p>\n<hr>\n<h1>Code and Syntax Highlighting</h1>\n<p>Inline <code>code</code> has <code>back-ticks around</code> it.</p>\n<pre><code class=\"language-javascript\">function $initHighlight(block, cls) {\n  try {\n    if (cls.search(/\\bno\\-highlight\\b/) != -1)\n      return process(block, true, 0x0F) +\n             ` class=\"${cls}\"`;\n  } catch (e) {\n    /* handle exception */\n  }\n  for (var i = 0 / 2; i &#x3C; classes.length; i++) {\n    if (checkCondition(classes[i]) === undefined)\n      console.log('undefined');\n  }\n}\n\nexport default $initHighlight;\n</code></pre>\n<hr>\n<h1>Tables</h1>\n<table>\n<thead>\n<tr>\n<th>First Header</th>\n<th>Second Header</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Content Cell</td>\n<td>Content Cell</td>\n</tr>\n<tr>\n<td>Content Cell</td>\n<td>Content Cell</td>\n</tr>\n</tbody>\n</table>\n<hr>\n<h1>Blockquotes</h1>\n<blockquote>\n<p>Blockquotes are very handy in email to emulate reply text.\nThis line is part of the same quote.</p>\n</blockquote>\n<p>Quote break.</p>\n<blockquote>\n<p>This is a very long line that will still be quoted properly when it wraps. Oh boy let's keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can <em>put</em> <strong>Markdown</strong> into a blockquote.</p>\n</blockquote>\n<blockquote>\n<p>Blockquotes can also be nested...</p>\n<blockquote>\n<p>...by using additional greater-than signs right next to each other...</p>\n<blockquote>\n<p>...or with spaces between arrows.</p>\n</blockquote>\n</blockquote>\n</blockquote>\n<hr>\n<h1>Inline HTML</h1>\n<hr>\n<h1>Horizontal Rules</h1>\n<p>Three or more...</p>\n<hr>\n<p>Hyphens</p>\n<hr>\n<p>Asterisks</p>\n<hr>\n<p>Underscores</p>\n<hr>\n<h1>Resolving resources</h1>\n<p><img src=\"dist/89a353e9c515885abd8e.png\" alt=\"Webpack\"></p>\n<section data-footnotes class=\"footnotes\"><h2 class=\"sr-only\" id=\"user-content-footnote-label\">Footnotes</h2>\n<ol>\n<li id=\"user-content-user-content-fn-first\">\n<p>Footnote <strong>can have markup</strong></p>\n<p>and multiple paragraphs. <a href=\"#user-content-fnref-first\" data-footnote-backref=\"\" aria-label=\"Back to reference 1\" class=\"data-footnote-backref\">↩</a></p>\n</li>\n<li id=\"user-content-user-content-fn-second\">\n<p>Footnote text. <a href=\"#user-content-fnref-second\" data-footnote-backref=\"\" aria-label=\"Back to reference 2\" class=\"data-footnote-backref\">↩</a> <a href=\"#user-content-fnref-second-2\" data-footnote-backref=\"\" aria-label=\"Back to reference 2-2\" class=\"data-footnote-backref\">↩<sup>2</sup></a></p>\n</li>\n</ol>\n</section>";

/***/ }

/******/ 	});
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		Object.defineProperties(exports, { [Symbol.toStringTag]: { value: 'Module' }, __esModule: { value: true } });
/******/ 	};
/******/ 	
/******/ 	/* webpack/runtime/to binary */
/******/ 	(() => {
/******/ 		// define to binary helper
/******/ 		const toImmutableBytes = (value) => {
/******/ 			let {buffer} = value;
/******/ 			const throwErr = () => {
/******/ 				throw new TypeError('ArrayBuffer is immutable');
/******/ 			};
/******/ 			Object.defineProperties(buffer, { immutable: { value: true },  resize: { value: throwErr }, transfer: { value: throwErr }, transferToFixedLength: { value: throwErr } });
/******/ 			Object.freeze(buffer);
/******/ 			return value;
/******/ 		}
/******/ 		__webpack_require__.tb =  (() => {
/******/ 			const table = new Uint8Array(128);
/******/ 			for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
/******/ 			return (base64) => {
/******/ 				const n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == '=') - (base64[n - 2] == '=')) * 3 / 4 | 0);
/******/ 				for (var i = 0, j = 0; i < n;) {
/******/ 					const c0 = table[base64.charCodeAt(i++)], c1 = table[base64.charCodeAt(i++)];
/******/ 					const c2 = table[base64.charCodeAt(i++)], c3 = table[base64.charCodeAt(i++)];
/******/ 					bytes[j++] = (c0 << 2) | (c1 >> 4);
/******/ 					bytes[j++] = (c1 << 4) | (c2 >> 2);
/******/ 					bytes[j++] = (c2 << 6) | c3;
/******/ 				}
/******/ 				return toImmutableBytes(bytes)
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _file_md__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./file.md */ 1);
/* harmony import */ var _raw_to_uint8_array_md__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./raw-to-uint8-array.md */ 7);
/* harmony import */ var _raw_to_string_md__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./raw-to-string.md */ 8);
// Import Markdown file and convert it to HTML


// Import Markdown file and get a Uint8Array


// Import Markdown file and get a string


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
markdownToHTMLText.innerHTML = _file_md__WEBPACK_IMPORTED_MODULE_0__;

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
markdownToRawTextUsingUint8Array.textContent = decoder.decode(_raw_to_uint8_array_md__WEBPACK_IMPORTED_MODULE_1__);

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

markdownToRawText.textContent = _raw_to_string_md__WEBPACK_IMPORTED_MODULE_2__;

toRawContainerUsingString.appendChild(markdownToRawText);

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 16.3 KiB [emitted] (name: main)
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: file.png] (auxiliary name: main)
chunk (runtime: main) output.js (main) 11.1 KiB (javascript) 14.6 KiB (asset) 210 bytes (asset-url) 1.21 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 8.69 KiB (javascript) 14.6 KiB (asset) 210 bytes (asset-url) [dependent] 8 modules
  runtime modules 1.21 KiB 2 modules
  ./example.js 2.39 KiB [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: file.png] (auxiliary name: main)
asset output.js 10.8 KiB [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 11.1 KiB (javascript) 14.6 KiB (asset) 210 bytes (asset-url) 1.03 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 14.6 KiB (asset) 210 bytes (asset-url) [dependent] 5 modules
  runtime modules 1.03 KiB 1 module
  ./example.js + 3 modules 11.1 KiB [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
