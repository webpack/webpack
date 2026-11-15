materializes an implied tag whose content opens in the head

A start tag `inBody` ignores still closed `<head>` on the way there, so

what follows it belongs to `<body>`; dropping the tag too would send it

back to the head the insertion modes had already left (§13.2.6.4.6).
