---
title: A fare watcher that lives on a shelf
date: 2026-10-15
description: "Night train fares move. A small script on an old mini PC checks them every morning and sends me one message when a fare drops."
tags: [Tools, Code, Budget]
cover:
  src: cover.webp
  alt: A small grey computer box on a desk by a window at dawn, with headphones, a mug and a potted plant.
---

Sleeper fares are not fixed. On the routes I watch, the price of a single berth moved eleven times in September, by as much as €70. Checking by hand every morning is a waste of a morning, so a small computer on my bookshelf does it for me.

## What it does

Once a day it asks the operator's booking site for the cheapest berth on the dates I care about, writes the price to a file, and sends me a message only when the price is lower than anything it has seen before. One message, not a feed.

## The list of trips

The watch list is a TOML file, so I can add a trip from my phone over SSH without touching the code:

```toml
[[watch]]
route = "Vienna Hbf → Roma Termini"
date = "2026-12-12"
berth = "sleeper-single"
below = 180

[[watch]]
route = "Brussels-Midi → Praha hl.n."
date = "2027-01-09"
berth = "couchette-4"
```

## The check

The part that matters is short. It keeps the lowest price per trip in a JSON file and compares:

```python
import json, tomllib
from pathlib import Path

SEEN = Path("seen.json")

def check(watch, fetch_price, notify):
    seen = json.loads(SEEN.read_text()) if SEEN.exists() else {}
    for w in watch:
        key = f'{w["route"]} {w["date"]} {w["berth"]}'
        price = fetch_price(w)
        if price is None:
            continue
        best = seen.get(key)
        if best is None or price < best:
            seen[key] = price
            if best is not None or price <= w.get("below", price):
                notify(f"{key}: €{price}" + (f" (was €{best})" if best else ""))
    SEEN.write_text(json.dumps(seen, indent=2))

if __name__ == "__main__":
    watch = tomllib.loads(Path("watch.toml").read_text())["watch"]
    from fares import fetch_price
    from notify import send
    check(watch, fetch_price, send)
```

`fetch_price` is the fragile part and differs per operator, so it lives in its own file. Be polite: one request per trip per day, with a clear user agent.

## Running it every morning

A single cron line, at a time when nobody else is booking:

```bash
17 6 * * * cd ~/fares && /usr/bin/python3 watch.py >> watch.log 2>&1
```

## Was it worth it?

It has saved me €212 since June, on five bookings. It also told me, more usefully, that most fares drop between six and three weeks before departure and then only go up.
