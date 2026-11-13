---
"webpack": patch
---

Minify HTML and CSS on the first pass to what a second pass would print: shorter attribute newlines, `&` and escape terminators, sorted rebuilt tags, joined `<style>` runs, settled `<html>` and `<body>` tags and a redundant `<script charset>`.
