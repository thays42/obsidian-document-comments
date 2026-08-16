/**
 * Retains the last non-empty reading-view selection.
 *
 * On iOS every route to running a command — the command palette, the mobile
 * toolbar — requires a tap outside the selected text, and WKWebView collapses
 * the selection on that tap. By the time "Add comment in reading view" runs,
 * `getSelection()` is empty and the command refuses. Capturing on
 * `selectionchange` and restoring at command time makes the existing code path
 * see the selection the user actually made.
 */
export class ReadingSelectionCache {
	private cached: Range | null = null;

	constructor(private readonly doc: Document) {}

	/** Bind to `selectionchange`. Empty selections are ignored so the collapse
	 *  that the tap itself causes doesn't overwrite what we're trying to keep. */
	capture = (): void => {
		const selection = this.doc.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		if (!selection.toString().trim()) return;
		this.cached = selection.getRangeAt(0).cloneRange();
	};

	/** Put the cached range back when the live selection is empty.
	 *  Returns whether a restore happened. */
	restoreIfCollapsed = (): boolean => {
		const selection = this.doc.getSelection();
		if (selection && selection.rangeCount > 0 && selection.toString().trim()) return false;

		const range = this.cached;
		if (!range) return false;
		// A reading-view re-render detaches the nodes; a stale range would map to
		// nonsense offsets, so drop it rather than anchor a comment to nowhere.
		if (!range.startContainer.isConnected || !range.endContainer.isConnected) {
			this.cached = null;
			return false;
		}
		if (!selection) return false;

		selection.removeAllRanges();
		selection.addRange(range);
		return true;
	};

	clear = (): void => {
		this.cached = null;
	};
}
