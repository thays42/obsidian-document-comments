// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { ReadingSelectionCache } from "../src/reading/selection-cache";

const setup = (html: string) => {
	document.body.innerHTML = html;
	const target = document.querySelector("p") as HTMLElement;
	return { target, selection: document.getSelection() as Selection };
};

const select = (selection: Selection, node: Node) => {
	const range = document.createRange();
	range.selectNodeContents(node);
	selection.removeAllRanges();
	selection.addRange(range);
};

describe("ReadingSelectionCache", () => {
	it("restores a collapsed selection from the last captured one", () => {
		const { target, selection } = setup("<p>ship on Friday</p>");
		const cache = new ReadingSelectionCache(document);

		select(selection, target);
		cache.capture();

		selection.removeAllRanges(); // what iOS does when the user taps the toolbar
		expect(selection.toString()).toBe("");

		expect(cache.restoreIfCollapsed()).toBe(true);
		expect(selection.toString()).toBe("ship on Friday");
	});

	it("leaves a live selection alone", () => {
		const { target, selection } = setup("<p>first</p><p>second</p>");
		const cache = new ReadingSelectionCache(document);

		select(selection, target);
		cache.capture();
		select(selection, document.querySelectorAll("p")[1] as HTMLElement);

		expect(cache.restoreIfCollapsed()).toBe(false);
		expect(selection.toString()).toBe("second");
	});

	it("never captures an empty selection", () => {
		const { selection } = setup("<p>text</p>");
		const cache = new ReadingSelectionCache(document);

		selection.removeAllRanges();
		cache.capture();

		expect(cache.restoreIfCollapsed()).toBe(false);
	});

	it("discards a cached range whose nodes left the document", () => {
		const { target, selection } = setup("<p>gone soon</p>");
		const cache = new ReadingSelectionCache(document);

		select(selection, target);
		cache.capture();
		selection.removeAllRanges();
		target.remove(); // a reading-view re-render

		expect(cache.restoreIfCollapsed()).toBe(false);
	});

	it("clear forgets the cached range", () => {
		const { target, selection } = setup("<p>text</p>");
		const cache = new ReadingSelectionCache(document);

		select(selection, target);
		cache.capture();
		cache.clear();
		selection.removeAllRanges();

		expect(cache.restoreIfCollapsed()).toBe(false);
	});

	// The class has no notion of "recently" — it cannot tell a selection collapsed
	// a moment ago by the tap that invoked this command from one collapsed long
	// before, for an unrelated reason. A single restore proves nothing about that:
	// this drives restoreIfCollapsed() a second time, with no intervening capture(),
	// to show the same cached range answers an unrelated later invocation too. That
	// blindness is exactly why callers must gate this cache behind Platform.isMobile:
	// on desktop, an empty selection later in the session would otherwise be silently
	// answered with whatever was last selected, anchoring a comment to text the user
	// isn't looking at.
	it("keeps answering later empty-selection checks from the same capture, with no notion of how much time has passed — why callers must gate this behind Platform.isMobile", () => {
		const { target, selection } = setup("<p>ship on Friday</p>");
		const cache = new ReadingSelectionCache(document);

		select(selection, target);
		cache.capture();

		selection.removeAllRanges(); // the tap that invoked the first command
		expect(cache.restoreIfCollapsed()).toBe(true);
		expect(selection.toString()).toBe("ship on Friday");

		selection.removeAllRanges(); // an unrelated later invocation, no new capture()
		expect(cache.restoreIfCollapsed()).toBe(true);
		expect(selection.toString()).toBe("ship on Friday");
	});
});
