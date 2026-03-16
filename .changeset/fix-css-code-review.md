---
"webpack": patch
---

Fix multiple bugs and optimizations in CSS modules: correct third code point position in walkCssTokens number detection, fix multiline CSS comment regex, fix swapped :import/:export error message, fix comma callback incorrectly popping balanced stack, fix cache comparison missing array length check, fix match.index mutation side effect, move publicPathAutoRegex to module scope, precompute merged callbacks in consumeUntil, simplify redundant ternary in CssGenerator, fix typo GRID_TEMPLATE_ARES, remove duplicate grid-column-start, and merge duplicate getCompilationHooks calls.
