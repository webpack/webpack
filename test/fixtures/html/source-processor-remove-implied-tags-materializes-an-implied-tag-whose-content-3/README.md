materializes an implied tag whose content opens with whitespace

Before `<body>` has started the insertion modes drop leading whitespace,

so dropping the tag too would lose the text node re-parsing must keep.
