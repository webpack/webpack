drops a last child's end tag only when the parent's puts it back

"Any other end tag" walks past what is not special, so `</select>` closes

an `<optgroup>` / `<option>` however the parent is spelled.

A special one blocks that walk, so it needs a parent whose end tag

generates implied end tags.

`</template>` closes what is open in the content fragment.
