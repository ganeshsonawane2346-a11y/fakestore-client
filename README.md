# FakeStore Client

A vanilla JavaScript (ES6+ modules) client for [FakeStoreAPI](https://fakestoreapi.com).

## Features
- `async/await` fetching with timeout, retry and typed `ApiError` (`js/api.js`)
- Debounced live search, category tabs and sorting with no page reloads (`js/app.js`)
- Cart and sort/category preferences persisted in `localStorage`
- Loading skeletons and a dismissible error banner with a Retry button

## Run locally
ES modules need an HTTP server (not `file://`):

    python3 -m http.server 8000   # then open http://localhost:8000

## Structure
    index.html
    styles.css
    js/api.js   # network layer
    js/app.js   # state, rendering, events

## Testing the error state
Open DevTools → Network → set "Offline", then click Retry.
