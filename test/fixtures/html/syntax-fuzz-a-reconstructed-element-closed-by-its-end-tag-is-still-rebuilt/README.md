A reconstructed element closed by its own end tag is still rebuilt

As in `syntax-fuzz-a-script-a-reconstructed-element-holds-is-outside-the-table-range`,

fostered `a` rebuilds `<b>` before the inner table and `<script>` goes into it.

Here `</b>` closes that `<b>`, which gives it a range of its own, but it still

has no start tag: sliced, `<table>a<script></script>` has no `<b>` to rebuild.
