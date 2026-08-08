const assert = require("assert");
const { parseListDescription, renderListPage } = require("./listPageGenerator");

const parsed = parseListDescription(`
SHNEEEV LIST
Title: Top 5 Most Anticipated Mice of 2026
Intro: The mice I am most excited to try this year.
Category: Mouse Guide
Item 1 Name: Example Mouse One
Item 1 Link: https://example.com/one
Item 1 Price: $129.99
Item 1 Note: The shape and sensor combination looks promising.
Item 2 Name: Example Mouse Two
Item 2 Note: A lightweight option with an unusual shape.
END SHNEEEV LIST
`);

assert(parsed, "Expected the ranked-list block to parse.");
assert.strictEqual(parsed.title, "Top 5 Most Anticipated Mice of 2026");
assert.strictEqual(parsed.items.length, 2);
assert.deepStrictEqual(parsed.items.map(item => item.rank), [1, 2]);
assert.strictEqual(parsed.items[0].link, "https://example.com/one");
assert.strictEqual(parsed.items[1].link, undefined);

const html = renderListPage({
    title: parsed.title,
    url: "https://www.youtube.com/watch?v=abcdefghijk",
    published: "2026-08-08T12:00:00Z",
    duration: "10:00"
}, parsed, parsed.title, "lists/top-5-most-anticipated-mice-of-2026/");
assert(html.includes("https://example.com/one"), "Expected the purchase link in the generated page.");
assert(html.includes("These are not affiliate links"), "Expected the link disclosure in the generated page.");
assert(html.includes("Purchase link coming soon"), "Expected a fallback when a purchase link is omitted.");

const invalidLink = parseListDescription(`
SHNEEEV LIST
Item 1 Name: Unsafe Link Mouse
Item 1 Link: http://example.com/mouse
END SHNEEEV LIST
`);
assert.strictEqual(invalidLink, null, "Expected non-HTTPS links to be rejected.");

console.log("Ranked-list generator tests passed.");
