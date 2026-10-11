# Generation debug

To inspect the actual creative inputs and hidden Director decisions, open the browser console and run:

```js
unwrittenDebug.enable()
```

A **Generation debug** section appears in the lore panel. During world generation and the epilogue, the same section appears directly on the screen, including its loading and error states.

Expand a request to see its seeds, theme inputs, and literary inspiration with source attribution. The original request, system prompt, input game-state snapshot, and structured output are expandable separately. Each attempt records its actual prompt and response, including validation feedback and invalid output when a schema retry occurs. Director outputs include option effects, storyline changes, flags, unlocked actions, requirements, and threat foreshadowing. The current hidden-state section shows the live game state alongside those request-time snapshots.

Disable the UI with:

```js
unwrittenDebug.disable()
```

The enabled preference survives page reloads. Request history is kept in memory, even while the UI is disabled, so enabling it after a scene reveals the inputs already used. History resets on reload, starting a new saga, or continuing a saved game; it is not part of the game save. Older saves have no seed history to recover. Up to 512 requests are retained, and schema retries reuse their original record and quote.

For console access to the recorded data:

```js
unwrittenDebug.records() // Returns a copy of the request history.
unwrittenDebug.clear()   // Clears the history without changing visibility.
```
