import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: ["media:content", "content:encoded"],
  },
});

export default parser;
