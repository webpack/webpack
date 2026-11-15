keeps the end tag of a `/>` element that has children

`/>` only closes the tag in foreign content; in HTML it is ignored, and

whether the end tag is needed hangs on what ends up inside.

The `</div>` stays: an empty element's `/` closes nothing either.
