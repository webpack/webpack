# Markdown examples

This example demonstrates how to use Markdown files, convert (transform) them to HTML, or import them as is.

Configuration example:

```javascript
/** @typedef {import("webpack").LoaderContext<void>} LoaderContext */

import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	module: {
		rules: [
			// To convert Markdown syntax to HTML
			{
				test: /\.(md|markdown|mdown|mkdn|mkd|mdwn|mkdown|ron)$/i,
				exclude: /(raw-to-string|raw-to-uint8-array)\.md/,
				loader: "html-loader",
				options: {
					preprocessor:
						/**
						 * @param {string} content content
						 * @param {LoaderContext} loaderContext loader context
						 * @returns {Promise<string>} result
						 */
						async (content, loaderContext) => {
							const file = await unified()
								.use(remarkParse)
								.use(remarkFrontmatter)
								.use(remarkGfm)
								.use(remarkRehype)
								.use(rehypeSanitize)
								.use(rehypeStringify)
								.process(content);

							return String(file);
						}
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
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*****************!*\
  !*** ./file.md ***!
  \*****************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.b, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Imports
var ___HTML_LOADER_IMPORT_0___ = new URL(/* asset import */ __webpack_require__(/*! ./file.png */ 2), __webpack_require__.b);
// Module
var code = `<h1>Headers</h1>
<h1>h1 Heading 8-)</h1>
<h2>h2 Heading</h2>
<h3>h3 Heading</h3>
<h4>h4 Heading</h4>
<h5>h5 Heading</h5>
<h6>h6 Heading</h6>
<p>Alternatively, for H1 and H2, an underline-ish style:</p>
<h1>Alt-H1</h1>
<h2>Alt-H2</h2>
<hr>
<h1>Emphasis</h1>
<p>Emphasis, aka italics, with <em>asterisks</em> or <em>underscores</em>.</p>
<p>Strong emphasis, aka bold, with <strong>asterisks</strong> or <strong>underscores</strong>.</p>
<p>Combined emphasis with <strong>asterisks and <em>underscores</em></strong>.</p>
<p>Strikethrough uses two tildes. <del>Scratch this.</del></p>
<p><strong>This is bold text</strong></p>
<p><strong>This is bold text</strong></p>
<p><em>This is italic text</em></p>
<p><em>This is italic text</em></p>
<p><del>Strikethrough</del></p>
<hr>
<h1>Lists</h1>
<ol>
<li>First ordered list item</li>
<li>Another item
⋅⋅* Unordered sub-list.</li>
<li>Actual numbers don't matter, just that it's a number
⋅⋅1. Ordered sub-list</li>
<li>And another item.</li>
</ol>
<p>⋅⋅⋅You can have properly indented paragraphs within list items. Notice the blank line above, and the leading spaces (at least one, but we'll use three here to also align the raw Markdown).</p>
<p>⋅⋅⋅To have a line break without a paragraph, you will need to use two trailing spaces.⋅⋅
⋅⋅⋅Note that this line is separate, but within the same paragraph.⋅⋅
⋅⋅⋅(This is contrary to the typical GFM line break behaviour, where trailing spaces are not required.)</p>
<ul>
<li>Unordered list can use asterisks</li>
</ul>
<ul>
<li>Or minuses</li>
</ul>
<ul>
<li>Or pluses</li>
</ul>
<ol>
<li>Make my changes
<ol>
<li>Fix bug</li>
<li>Improve formatting
<ul>
<li>Make the headings bigger</li>
</ul>
</li>
</ol>
</li>
<li>Push my commits to GitHub</li>
<li>Open a pull request
<ul>
<li>Describe my changes</li>
<li>Mention all the members of my team
<ul>
<li>Ask for feedback</li>
</ul>
</li>
</ul>
</li>
</ol>
<ul>
<li>Create a list by starting a line with <code>+</code>, <code>-</code>, or <code>*</code></li>
<li>Sub-lists are made by indenting 2 spaces:
<ul>
<li>Marker character change forces new list start:
<ul>
<li>Ac tristique libero volutpat at</li>
</ul>
<ul>
<li>Facilisis in pretium nisl aliquet</li>
</ul>
<ul>
<li>Nulla volutpat aliquam velit</li>
</ul>
</li>
</ul>
</li>
<li>Very easy!</li>
</ul>
<hr>
<h1>Task lists</h1>
<ul class="contains-task-list">
<li class="task-list-item"><input type="checkbox" checked disabled> Finish my changes</li>
<li class="task-list-item"><input type="checkbox" disabled> Push my commits to GitHub</li>
<li class="task-list-item"><input type="checkbox" disabled> Open a pull request</li>
<li class="task-list-item"><input type="checkbox" checked disabled> @mentions, #refs, <a href="">links</a>, <strong>formatting</strong>, and tags supported</li>
<li class="task-list-item"><input type="checkbox" checked disabled> list syntax required (any unordered or ordered list supported)</li>
<li class="task-list-item"><input type="checkbox" disabled> this is a complete item</li>
<li class="task-list-item"><input type="checkbox" disabled> this is an incomplete item</li>
</ul>
<hr>
<h1>Ignoring Markdown formatting</h1>
<p>You can tell GitHub to ignore (or escape) Markdown formatting by using \\ before the Markdown character.</p>
<p>Let's rename *our-new-project* to *our-old-project*.</p>
<hr>
<h1>Links</h1>
<p><a href="https://www.google.com">I'm an inline-style link</a></p>
<p><a href="https://www.google.com" title="Google&#x27;s Homepage">I'm an inline-style link with title</a></p>
<p><a href="https://www.mozilla.org">I'm a reference-style link</a></p>
<p><a href="../blob/master/LICENSE">I'm a relative reference to a repository file</a></p>
<p><a href="http://slashdot.org">You can use numbers for reference-style link definitions</a></p>
<p>Or leave it empty and use the <a href="http://www.reddit.com">link text itself</a>.</p>
<p>URLs and URLs in angle brackets will automatically get turned into links.
<a href="http://www.example.com">http://www.example.com</a> or <a href="http://www.example.com">http://www.example.com</a> and sometimes
example.com (but not on Github, for example).</p>
<p>Some text to show that the reference links can follow later.</p>
<hr>
<h1>Images</h1>
<p>Here's our logo (hover to see the title text):</p>
<p>Inline-style:
<img src="https://webpack.js.org/assets/icon-square-big.svg" alt="alt text" title="Logo Title Text 1"></p>
<p>Reference-style:
<img src="https://webpack.js.org/assets/icon-square-big.svg" alt="alt text" title="Logo Title Text 2"></p>
<p><img src="https://octodex.github.com/images/minion.png" alt="Minion">
<img src="https://octodex.github.com/images/stormtroopocat.jpg" alt="Stormtroopocat" title="The Stormtroopocat"></p>
<p>Like links, Images also have a footnote style syntax</p>
<p><img src="https://octodex.github.com/images/dojocat.jpg" alt="Alt text" title="The Dojocat"></p>
<p>With a reference later in the document defining the URL location:</p>
<hr>
<h1><a href="https://github.com/markdown-it/markdown-it-footnote">Footnotes</a></h1>
<p>Footnote 1 link<sup><a href="#user-content-fn-first" id="user-content-user-content-fnref-first" data-footnote-ref aria-describedby="user-content-footnote-label">1</a></sup>.</p>
<p>Footnote 2 link<sup><a href="#user-content-fn-second" id="user-content-user-content-fnref-second" data-footnote-ref aria-describedby="user-content-footnote-label">2</a></sup>.</p>
<p>Inline footnote^[Text of inline footnote] definition.</p>
<p>Duplicated footnote reference<sup><a href="#user-content-fn-second" id="user-content-user-content-fnref-second-2" data-footnote-ref aria-describedby="user-content-footnote-label">2</a></sup>.</p>
<hr>
<h1>Code and Syntax Highlighting</h1>
<p>Inline <code>code</code> has <code>back-ticks around</code> it.</p>
<pre><code class="language-javascript">function \$initHighlight(block, cls) {
  try {
    if (cls.search(/\\bno\\-highlight\\b/) != -1)
      return process(block, true, 0x0F) +
             \` class="\${cls}"\`;
  } catch (e) {
    /* handle exception */
  }
  for (var i = 0 / 2; i &#x3C; classes.length; i++) {
    if (checkCondition(classes[i]) === undefined)
      console.log('undefined');
  }
}

export default \$initHighlight;
</code></pre>
<hr>
<h1>Tables</h1>
<table>
<thead>
<tr>
<th>First Header</th>
<th>Second Header</th>
</tr>
</thead>
<tbody>
<tr>
<td>Content Cell</td>
<td>Content Cell</td>
</tr>
<tr>
<td>Content Cell</td>
<td>Content Cell</td>
</tr>
</tbody>
</table>
<hr>
<h1>Blockquotes</h1>
<blockquote>
<p>Blockquotes are very handy in email to emulate reply text.
This line is part of the same quote.</p>
</blockquote>
<p>Quote break.</p>
<blockquote>
<p>This is a very long line that will still be quoted properly when it wraps. Oh boy let's keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can <em>put</em> <strong>Markdown</strong> into a blockquote.</p>
</blockquote>
<blockquote>
<p>Blockquotes can also be nested...</p>
<blockquote>
<p>...by using additional greater-than signs right next to each other...</p>
<blockquote>
<p>...or with spaces between arrows.</p>
</blockquote>
</blockquote>
</blockquote>
<hr>
<h1>Inline HTML</h1>
<hr>
<h1>Horizontal Rules</h1>
<p>Three or more...</p>
<hr>
<p>Hyphens</p>
<hr>
<p>Asterisks</p>
<hr>
<p>Underscores</p>
<hr>
<h1>Resolving resources</h1>
<p><img src="${___HTML_LOADER_IMPORT_0___}" alt="Webpack"></p>
<section data-footnotes class="footnotes"><h2 class="sr-only" id="user-content-footnote-label">Footnotes</h2>
<ol>
<li id="user-content-user-content-fn-first">
<p>Footnote <strong>can have markup</strong></p>
<p>and multiple paragraphs. <a href="#user-content-fnref-first" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
<li id="user-content-user-content-fn-second">
<p>Footnote text. <a href="#user-content-fnref-second" data-footnote-backref="" aria-label="Back to reference 2" class="data-footnote-backref">↩</a> <a href="#user-content-fnref-second-2" data-footnote-backref="" aria-label="Back to reference 2-2" class="data-footnote-backref">↩<sup>2</sup></a></p>
</li>
</ol>
</section>`;
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (code);

/***/ }),
/* 2 */
/*!******************!*\
  !*** ./file.png ***!
  \******************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.p, module, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "89a353e9c515885abd8e.png";

/***/ }),
/* 3 */
/*!*******************************!*\
  !*** ./raw-to-uint8-array.md ***!
  \*******************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.*, __webpack_require__.tb, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.tb("IyBFeGFtcGxlIGhlYWRpbmdzCgojIyBTYW1wbGUgU2VjdGlvbgoKIyMgVGhpcydsbCBiZSBhIF9IZWxwZnVsXyBTZWN0aW9uIEFib3V0IHRoZSBHcmVlayBMZXR0ZXIgzpghCgpBIGhlYWRpbmcgY29udGFpbmluZyBjaGFyYWN0ZXJzIG5vdCBhbGxvd2VkIGluIGZyYWdtZW50cywgVVRGLTggY2hhcmFjdGVycywgdHdvIGNvbnNlY3V0aXZlIHNwYWNlcyBiZXR3ZWVuIHRoZSBmaXJzdCBhbmQgc2Vjb25kIHdvcmRzLCBhbmQgZm9ybWF0dGluZy4KCiMjIFRoaXMgaGVhZGluZyBpcyBub3QgdW5pcXVlIGluIHRoZSBmaWxlCgpURVhUIDEKCiMjIFRoaXMgaGVhZGluZyBpcyBub3QgdW5pcXVlIGluIHRoZSBmaWxlCgpURVhUIDIK");

/***/ }),
/* 4 */
/*!**************************!*\
  !*** ./raw-to-string.md ***!
  \**************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "# Example headings\n\n## Sample Section\n\n## This'll be a _Helpful_ Section About the Greek Letter Θ!\n\nA heading containing characters not allowed in fragments, UTF-8 characters, two consecutive spaces between the first and second words, and formatting.\n\n## This heading is not unique in the file\n\nTEXT 1\n\n## This heading is not unique in the file\n\nTEXT 2\n";

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/to binary */
/******/ 	(() => {
/******/ 		// define to binary helper
/******/ 		__webpack_require__.tb =  (() => {
/******/ 			var table = new Uint8Array(128);
/******/ 			for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
/******/ 			return (base64) => {
/******/ 				var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == '=') - (base64[n - 2] == '=')) * 3 / 4 | 0);
/******/ 				for (var i = 0, j = 0; i < n;) {
/******/ 					var c0 = table[base64.charCodeAt(i++)], c1 = table[base64.charCodeAt(i++)];
/******/ 					var c2 = table[base64.charCodeAt(i++)], c3 = table[base64.charCodeAt(i++)];
/******/ 					bytes[j++] = (c0 << 2) | (c1 >> 4);
/******/ 					bytes[j++] = (c1 << 4) | (c2 >> 2);
/******/ 					bytes[j++] = (c2 << 6) | c3;
/******/ 				}
/******/ 				return bytes
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = (typeof document !== 'undefined' && document.baseURI) || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			0: 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
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
/* harmony import */ var _raw_to_uint8_array_md__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./raw-to-uint8-array.md */ 3);
/* harmony import */ var _raw_to_string_md__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./raw-to-string.md */ 4);
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
markdownToHTMLText.innerHTML = _file_md__WEBPACK_IMPORTED_MODULE_0__["default"];

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
asset output.js 18.6 KiB [emitted] (name: main)
asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: file.png] (auxiliary name: main)
chunk (runtime: main) output.js (main) 11.3 KiB (javascript) 14.6 KiB (asset) 1.78 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 1.78 KiB 6 modules
  dependent modules 8.89 KiB (javascript) 14.6 KiB (asset) [dependent] 4 modules
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
chunk (runtime: main) output.js (main) 14.6 KiB (asset) 11.4 KiB (javascript) 1.22 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 1.22 KiB 4 modules
  dependent modules 14.6 KiB (asset) 42 bytes (javascript) [dependent] 1 module
  ./example.js + 3 modules 11.3 KiB [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
