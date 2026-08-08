# Amazon High-Res cover source

Shelf of Fame probes Amazon's public image CDN for books with an ISBN.

- ISBN-13 values beginning with `978` are converted to ISBN-10.
- Candidate URL: `https://m.media-amazon.com/images/P/{ISBN10}.01._SCRM_SL2000_.jpg`
- The route validates the candidate with `HEAD` before returning it.
- Only successful JPEG responses are accepted.
- Responses with a known tiny placeholder-size payload are rejected.
- Amazon is an additive candidate source; failure returns no Amazon candidate and does not affect Open Library, Google Books, LibraryThing, or saved preferred covers.
- Related ISBNs discovered during the deeper LibraryThing pass are also probed.

Implementation pattern adapted from Calibre-Web-NextGen's GPL-3.0 `cps/services/cover_booster.py` behavior, reimplemented in TypeScript for Shelf of Fame.
