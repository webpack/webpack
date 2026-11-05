leaves an escaped unicode range escaped

Chromium reads a urange only from a literal `u`, so this one is invalid.
