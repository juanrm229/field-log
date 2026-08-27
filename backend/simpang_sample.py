"""Sample content for Simpang — the map of journals that cross.

Deliberately NOT auto-seeded at boot, unlike seed_data.py. This is fiction the
site's owner did not write, so it is only loaded on request, from the button in
Studio (POST /api/simpang/sample). Delete this file if the sample is no longer
wanted; the server only reads it when that endpoint is called.

The names follow the entries in seed_data.py — Aru from "The Cartographer of
Silence", Saskia from "Rain Over Batavia", Dimas from "The Last Train to
Lembang" — plus Ratri and Wira from the novel in progress.

`variant` reuses the existing cover variants; the map turns each one into an ink
colour. Two claims that share a `key` inside one junction but say different
things are surfaced as a contradiction.
"""

SAMPLE_CHARACTERS = [
    {"name": "Aru", "role": "Cartographer", "variant": "orange", "t_start": 1, "t_end": 12, "gaps": []},
    {"name": "Saskia", "role": "Archivist", "variant": "blue", "t_start": 3, "t_end": 12, "gaps": []},
    {"name": "Dimas", "role": "Passenger", "variant": "forest", "t_start": 1, "t_end": 7, "gaps": []},
    {"name": "Ratri", "role": "Ticket clerk", "variant": "sand", "t_start": 2, "t_end": 12, "gaps": []},
    {"name": "Wira", "role": "The father who left", "variant": "slate", "t_start": 5, "t_end": 10, "gaps": [[5, 7]]},
]

SAMPLE_MOMENTS = [
    {
        "label": "Platform Nine",
        "place": "Kiaracondong Station",
        "t": 2,
        "date_label": "the third day, before dawn",
        "above": True,
        "cast": ["dimas", "ratri"],
        "note": "One of them has given themselves a line that was never spoken. Suspect whoever wanted it most.",
        "entries": {
            "dimas": {
                "body": (
                    "The ticket was in my hand, printed on paper that smelled like my father's jacket. "
                    "Platform nine was on no board anywhere. She checked my ticket, nodded, and said the "
                    "thing clerks always say to the recently bereaved: mind the gap."
                ),
                "claims": [
                    {"key": "inspection", "text": "She checked my ticket, nodded, and said: mind the gap."},
                    {"key": "platform", "text": "Platform nine was on no board anywhere."},
                ],
            },
            "ratri": {
                "body": (
                    "A boy with a ticket to a place that has no rails. I did not check it. I only opened the "
                    "platform door and said nothing at all. Fifteen years in this booth and I have seen a "
                    "ticket like that twice."
                ),
                "claims": [
                    {"key": "inspection", "text": "I did not check it. I only opened the door and said nothing."},
                    {"key": "platform", "text": "Platform nine was on no board anywhere."},
                ],
            },
        },
    },
    {
        "label": "The Sweating Box",
        "place": "City Archive",
        "t": 4,
        "date_label": "monsoon, the ninth year",
        "above": True,
        "cast": ["saskia", "aru"],
        "note": "",
        "entries": {
            "saskia": {
                "body": (
                    "The box sweated on my desk all morning. Grandfather wrote DO NOT OPEN UNTIL THE RAIN "
                    "STOPS, and the rain has not stopped in nine years, so I waited for a reason. The reason "
                    "arrived in the shape of a man asking for the plans of the radio hill."
                ),
                "claims": [{"key": "visit", "text": "That afternoon a man came in asking for the plans of the radio hill."}],
            },
            "aru": {
                "body": (
                    "The archive smelled of wet paper and patience. I came for the transmitter drawings; what "
                    "I found was a woman holding a box the way people hold something still breathing. I did "
                    "not ask what was inside. That was my first mistake."
                ),
                "claims": [{"key": "visit", "text": "That afternoon a man came in asking for the plans of the radio hill."}],
            },
        },
    },
    {
        "label": "Rain in the Ninth Year",
        "place": "The Crossing",
        "t": 6,
        "date_label": "12 November — afternoon",
        "above": False,
        "cast": ["saskia", "ratri", "dimas"],
        "note": "Forty-two umbrellas, or new shoes that stayed clean. One of these memories was assembled later — and whoever assembled it may not know.",
        "entries": {
            "saskia": {
                "body": (
                    "It rained all afternoon — not drizzle, but the kind of rain that drives people under "
                    "whatever is nearest. I remember because I counted umbrellas from the third-floor window: "
                    "forty-one, forty-two."
                ),
                "claims": [
                    {"key": "weather", "text": "It rained all afternoon — people sheltered under whatever was nearest."},
                    {"key": "presence", "text": "The three of us were at the same crossing that afternoon."},
                ],
            },
            "ratri": {
                "body": (
                    "That afternoon was dry. I remember exactly, because my shoes were new and I walked past "
                    "the crossing on purpose so someone would see them. There was not one umbrella the whole "
                    "length of that street. Not one."
                ),
                "claims": [
                    {"key": "weather", "text": "That afternoon was dry. Not one umbrella the whole length of the street."},
                    {"key": "presence", "text": "The three of us were at the same crossing that afternoon."},
                ],
            },
            "dimas": {
                "body": (
                    "I do not remember the weather. I remember that exactly one person spoke to me at that "
                    "crossing, and I did not answer. Nine years on I am still counting the time I spent not "
                    "answering."
                ),
                "claims": [{"key": "presence", "text": "The three of us were at the same crossing that afternoon."}],
            },
        },
    },
    {
        "label": "The Antenna",
        "place": "Radio Hill",
        "t": 8,
        "date_label": "no date — Aru never wrote one down",
        "above": True,
        "cast": ["aru", "wira"],
        "note": "",
        "entries": {
            "aru": {
                "body": (
                    "The antenna still pointed at the sky the way old men point at photographs — certain "
                    "something is there, unable to say its name. Someone else was sitting beneath it, as "
                    "though he had been waiting a long time for anyone who knew the way up."
                ),
                "claims": [{"key": "conversation", "text": "Neither of us asked the other a single question."}],
            },
            "wira": {
                "body": (
                    "I waited nine years on this hill for someone to ask. The boy arrived with a compass and "
                    "three pencils, measured the antenna's shadow twice, and went home. He asked nothing."
                ),
                "claims": [{"key": "conversation", "text": "Neither of us asked the other a single question."}],
            },
        },
    },
    {
        "label": "The Letter Not Sent",
        "place": "The Crossing",
        "t": 10,
        "date_label": "the last night before the line closed",
        "above": True,
        "cast": ["ratri", "wira"],
        "note": "",
        "entries": {
            "ratri": {
                "body": (
                    "I wrote the letter three times and burned it twice. The third I kept in the ticket "
                    "drawer, under the stamp nobody has used since the line closed. That drawer was never "
                    "locked. That is the part I think about most."
                ),
                "claims": [{"key": "distance", "text": "That night we were never more than twenty steps apart."}],
            },
            "wira": {
                "body": (
                    "Someone told me the woman in the booth was keeping a letter for me. I did not go in. I "
                    "stood across the road, counted to a hundred, and left — and all the way home I assembled "
                    "reasons I did not believe."
                ),
                "claims": [{"key": "distance", "text": "That night we were never more than twenty steps apart."}],
            },
        },
    },
]
