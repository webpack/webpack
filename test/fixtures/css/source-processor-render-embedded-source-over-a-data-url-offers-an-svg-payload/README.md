A rebuilt url keeps its base64-ness, and loses quotes it no longer needs.

A space or a quote in an answer would end the url token, so the url takes quotes and the delimiter inside it is escaped; otherwise the declaration is dropped.
