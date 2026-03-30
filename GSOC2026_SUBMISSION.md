\# GSoC 2026 Proposal: Entry points as HTML for Webpack



**Name:** Shaik Akhil

**Project:** Webpack - Entry points as HTML

**Difficulty**: Medium

**Time**: 350 hours



**Problem Statement**

Currently webpack only accepts JavaScript files as entry points. This project adds native support for HTML entry points.



\## Proposed Solution







\### Architecture Overview



webpack.config.js entry: "index.html"

↓

EntryOptionPlugin detects .html extension

↓

HtmlEntryPlugin processes HTML file

↓

Extract linked CSS/JS/assets

↓

Bundle them as separate chunks

↓

Output HTML with correct hashed URLs



**File 2: lib/HtmlEntryPlugin.js (new file)**



javascript

class HtmlEntryPlugin {

&#x20; constructor(htmlPath) {

&#x20;   this.htmlPath = htmlPath;

&#x20; }

&#x20;

&#x20; apply(compiler) {

&#x20;   compiler.hooks.make.tapAsync('HtmlEntryPlugin', (compilation, callback) => {

&#x20;     // Parse HTML, find <link href="\\\*.css"> and <script src="\\\*.js">

&#x20;     // Add them as dependencies

&#x20;     callback();

&#x20;   });

&#x20; }

}









**Code Changes Required**





\*\*File 1: `lib/EntryOptionPlugin.js`\*\*

```javascript

// Add HTML detection (line \\\~45)

if (typeof entry === 'string' \\\&\\\& entry.endsWith('.html')) {

\&#x20; return new HtmlEntryPlugin(entry);

}






