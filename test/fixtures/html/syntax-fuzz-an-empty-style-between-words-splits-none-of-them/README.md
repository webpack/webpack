an empty `<style>` between words splits none of them

`removeEmptyElements` drops it, and `=` and `-->` print as one word.

The UA stylesheet gives `<style>` and `<script>` `display: none`, so the source

renders that one word too: `meaning` reads them as splitting nothing.
