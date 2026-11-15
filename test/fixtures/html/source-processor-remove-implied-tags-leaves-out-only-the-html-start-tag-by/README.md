leaves out only the <html> start tag by default

`</html>` stays with it: a reader checking the page downloaded whole

looks for one, and only the start tag is what nothing matches on.

---

keeps all three when off, and the other optional tags still go

Every optional tag but these three is dropped whatever the option says:

nothing can observe that, and only these three are what a consumer

reading the page with a regexp looks for.
