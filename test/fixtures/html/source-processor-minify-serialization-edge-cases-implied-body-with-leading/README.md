implied <body> with leading whitespace

Every other minify transform is covered end to end by

`configCases/html/minimize-transforms`. CR cases cannot live there:

`.gitattributes` checks `test/` out with LF, so a CR needs a string here.

Found by running the html5lib serializer corpus through minify: a

transparent implied `<body>` puts the run where re-parsing drops it,

since the modes before `<body>` starts ignore whitespace.

Nothing to keep when the run is not in the body to begin with.
