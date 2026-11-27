a `<script>` a reconstructed element holds is outside the table's range

The second `<table>` closes the first, popping `<b>` but leaving it on the list

of active formatting elements. Fostered, `a` rebuilds that `<b>` before the

table, and `<script>`, read "in table", goes into the current node: that `<b>`.

Sliced, `<table>a<script>` has no `<b>` to rebuild, so the script joins the

table; no fragment context carries the list, so `slices` skips such a range.
