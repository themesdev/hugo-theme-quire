---
title: Reading a GTFS timetable in 40 lines of Python
date: 2026-10-28
description: "Every European rail operator publishes its timetable as GTFS. A short script that answers the only question I ever ask it: what leaves from here after six?"
tags: [Tools, Code]
cover:
  src: cover.webp
  alt: An open laptop and a cup of coffee on a train table, a river valley passing outside the window.
---

Journey planners are good at the fastest connection and bad at everything else. I want to ask different questions: which trains leave Ventimiglia after six in the evening, or which sleepers stop at a station I have never heard of. Most operators publish their whole timetable as [GTFS](https://gtfs.org/), a zip of plain CSV files, and you can answer those questions yourself.

## What is in the zip

A GTFS feed is a handful of text files. Four of them matter here:

- `stops.txt`: every station, with an id and a name
- `trips.txt`: every train run, with its route and service days
- `stop_times.txt`: when each trip calls at each stop
- `calendar.txt`: which days each service runs

`stop_times.txt` is the big one. For a national operator it runs to a few million rows, which is still small enough for the standard library.

## The script

This prints every departure from one station after a given time, on one date. No dependencies beyond Python 3.11.

```python
import csv, io, sys, zipfile
from datetime import date

def rows(z, name):
    with z.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, "utf-8-sig"))

def departures(feed, station, after, day):
    z = zipfile.ZipFile(feed)
    stops = {r["stop_id"] for r in rows(z, "stops.txt")
             if r["stop_name"].lower() == station.lower()}
    weekday = day.strftime("%A").lower()
    services = {r["service_id"] for r in rows(z, "calendar.txt")
                if r[weekday] == "1"
                and r["start_date"] <= day.strftime("%Y%m%d") <= r["end_date"]}
    trips = {r["trip_id"]: r for r in rows(z, "trips.txt") if r["service_id"] in services}
    out = []
    for r in rows(z, "stop_times.txt"):
        if r["stop_id"] in stops and r["trip_id"] in trips and r["departure_time"] >= after:
            t = trips[r["trip_id"]]
            out.append((r["departure_time"], t.get("trip_headsign", ""), t["route_id"]))
    return sorted(out)

if __name__ == "__main__":
    feed, station, after = sys.argv[1:4]
    for time, headsign, route in departures(feed, station, after, date.today()):
        print(f"{time[:5]}  {headsign:<30} {route}")
```

Run it with a feed, a station name and a time:

```bash
python departures.py trenitalia.zip "Ventimiglia" "18:00:00"
```

## Two things that will catch you out

**Times past midnight.** GTFS writes a train that leaves at 00:40 on a trip that started the evening before as `24:40:00`. The string comparison above still sorts correctly, which is the one time comparing times as strings is the right call.

**Calendar exceptions.** Holidays live in `calendar_dates.txt`, which I skip here. For a trip in December, read it too: a service can be added or removed for a single day.

## Where to get feeds

The [Mobility Database](https://mobilitydatabase.org/) lists feeds for most European operators, with links to the latest zip. Some need a free account; none of the ones I use cost anything.
