import type { GarmentsIssue, GarmentsPageAsset } from "./issues";
const colors = ["#e5e7e1", "#f3f2ed", "#dbe6e2", "#e5dbe1", "#d5e1e4", "#f0e7c8", "#dae4d4", "#dddddd"];
const titles = ["Paper study", "At Grandma's", "A place to stay", "Light & shade", "Through the leaves", "A slower afternoon", "Print study", "Grandma Jazz"];
const page = (number: number): GarmentsPageAsset => ({
  id: `test-${number}`, title: titles[number], alt: `Development test page ${number}: ${titles[number]}. Not a published Garments issue.`,
  text: "Development fixture. Reference photography from Grandma Jazz. Not a published issue or a stock listing.",
  fixture: { color: colors[number], number, photo: number % 2 === 0 ? "/garments/dev/bamboo.webp" : "/garments/dev/exterior.webp" },
});
export const fixtureIssue: GarmentsIssue = {
  id: "paper-study", slug: "paper-study", title: "Paper study", issueNumber: "TEST", publicationDate: "", width: 210, height: 297,
  cover: page(0), pages: Array.from({ length: 6 }, (_, i) => page(i + 1)), backCover: page(7), isDevelopmentFixture: true,
};
