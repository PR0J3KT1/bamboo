import { createCn } from "cn/config";

/* Class merging that knows our type scale (globals.css: --text-fine … --text-h1), so
   `text-body` is read as a size and `text-ink-2` as a colour. Without this the merge
   treats both as colours and drops one of them. */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["fine", "body", "lead", "h3", "h2", "h1"] }],
    },
  },
});
