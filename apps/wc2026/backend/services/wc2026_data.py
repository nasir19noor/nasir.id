"""
Static structural constants for the 2026 FIFA World Cup.

This is *only* the published FIFA draw — group assignments and the empty
knockout-bracket shape. No scores, no kickoff times, no rosters. All live
data is fetched from ESPN at runtime by services/espn_fetcher.py.
"""

# 12 groups × 4 teams (codes match ESPN's abbreviations).
WC2026_GROUPS: dict[str, list[str]] = {
    "A": ["MEX", "RSA", "KOR", "CZE"],
    "B": ["CAN", "BIH", "QAT", "SUI"],
    "C": ["BRA", "MAR", "HAI", "SCO"],
    "D": ["USA", "PAR", "AUS", "TUR"],
    "E": ["GER", "CUR", "IVC", "ECU"],
    "F": ["NED", "JPN", "SWE", "TUN"],
    "G": ["BEL", "EGY", "IRN", "NZL"],
    "H": ["ESP", "CPV", "SAU", "URU"],
    "I": ["FRA", "SEN", "IRQ", "NOR"],
    "J": ["ARG", "ALG", "AUT", "JOR"],
    "K": ["POR", "DRC", "UZB", "COL"],
    "L": ["ENG", "CRO", "GHA", "PAN"],
}

# 3-letter team code → (display name, ISO-3166-alpha-2 for flagcdn).
# The alpha-2 codes drive https://flagcdn.com/{w160}/{iso2}.png.
TEAM_META: dict[str, tuple[str, str]] = {
    "MEX": ("Mexico",                   "mx"),
    "RSA": ("South Africa",             "za"),
    "KOR": ("South Korea",              "kr"),
    "CZE": ("Czech Republic",           "cz"),
    "CAN": ("Canada",                   "ca"),
    "BIH": ("Bosnia and Herzegovina",   "ba"),
    "QAT": ("Qatar",                    "qa"),
    "SUI": ("Switzerland",              "ch"),
    "BRA": ("Brazil",                   "br"),
    "MAR": ("Morocco",                  "ma"),
    "HAI": ("Haiti",                    "ht"),
    "SCO": ("Scotland",                 "gb-sct"),
    "USA": ("United States",            "us"),
    "PAR": ("Paraguay",                 "py"),
    "AUS": ("Australia",                "au"),
    "TUR": ("Turkey",                   "tr"),
    "GER": ("Germany",                  "de"),
    "CUR": ("Curaçao",                  "cw"),
    "IVC": ("Ivory Coast",              "ci"),
    "ECU": ("Ecuador",                  "ec"),
    "NED": ("Netherlands",              "nl"),
    "JPN": ("Japan",                    "jp"),
    "SWE": ("Sweden",                   "se"),
    "TUN": ("Tunisia",                  "tn"),
    "BEL": ("Belgium",                  "be"),
    "EGY": ("Egypt",                    "eg"),
    "IRN": ("Iran",                     "ir"),
    "NZL": ("New Zealand",              "nz"),
    "ESP": ("Spain",                    "es"),
    "CPV": ("Cape Verde",               "cv"),
    "SAU": ("Saudi Arabia",             "sa"),
    "URU": ("Uruguay",                  "uy"),
    "FRA": ("France",                   "fr"),
    "SEN": ("Senegal",                  "sn"),
    "IRQ": ("Iraq",                     "iq"),
    "NOR": ("Norway",                   "no"),
    "ARG": ("Argentina",                "ar"),
    "ALG": ("Algeria",                  "dz"),
    "AUT": ("Austria",                  "at"),
    "JOR": ("Jordan",                   "jo"),
    "POR": ("Portugal",                 "pt"),
    "DRC": ("DR Congo",                 "cd"),
    "UZB": ("Uzbekistan",               "uz"),
    "COL": ("Colombia",                 "co"),
    "ENG": ("England",                  "gb-eng"),
    "CRO": ("Croatia",                  "hr"),
    "GHA": ("Ghana",                    "gh"),
    "PAN": ("Panama",                   "pa"),
}

# ESPN occasionally uses a different abbreviation than the consensus one
# above. Map ESPN → ours so we resolve fixtures correctly.
ESPN_ABBR_ALIASES: dict[str, str] = {
    "SAF": "RSA",   # South Africa
    "BOS": "BIH",   # Bosnia and Herzegovina
    "SWI": "SUI",   # Switzerland
    "MOR": "MAR",   # Morocco
    "CIV": "IVC",   # Ivory Coast
    "COD": "DRC",   # DR Congo
    "NZ":  "NZL",
    "ARG": "ARG",
}

# Empty knockout-bracket shape. Slots are numbered within their round.
KNOCKOUT_SHAPE: list[tuple[str, int]] = [
    ("r32",   16),
    ("r16",   8),
    ("qf",    4),
    ("sf",    2),
    ("third", 1),
    ("final", 1),
]


def team_lookup_code(raw: str) -> str:
    """Normalize a raw ESPN abbreviation to our canonical code."""
    raw = raw.strip().upper()
    return ESPN_ABBR_ALIASES.get(raw, raw)


# Reverse map: code → group letter, for fast classification.
TEAM_GROUP: dict[str, str] = {
    code: letter
    for letter, teams in WC2026_GROUPS.items()
    for code in teams
}

# Static reference signals fed to the prediction model. These are approximate
# public facts (FIFA men's ranking position and nominal GDP in USD billions),
# used only as *inputs* to Claude's reasoning — not authoritative. Update freely.
#   code: (fifa_rank, gdp_usd_billion)
TEAM_FACTS: dict[str, tuple[int, float]] = {
    "ARG": (1, 640),   "ESP": (2, 1580),  "FRA": (3, 3030),  "ENG": (4, 3340),
    "BRA": (5, 2170),  "POR": (6, 287),   "NED": (7, 1120),  "BEL": (8, 630),
    "GER": (9, 4460),  "CRO": (10, 80),   "URU": (15, 77),   "COL": (16, 360),
    "USA": (11, 27000),"MEX": (12, 1790), "ITA": (13, 2250), "SUI": (19, 885),
    "JPN": (17, 4210), "SEN": (18, 31),   "IRN": (20, 405),  "KOR": (22, 1710),
    "ECU": (23, 119),  "AUT": (24, 516),  "AUS": (25, 1690), "MAR": (12, 144),
    "CIV": (40, 79),   "IVC": (40, 79),   "NOR": (29, 485),  "SCO": (35, 250),
    "PAR": (45, 42),   "TUN": (44, 49),   "EGY": (33, 396),  "ALG": (38, 240),
    "NZL": (86, 250),  "QAT": (37, 235),  "SAU": (58, 1110), "GHA": (70, 76),
    "CPV": (66, 2.6),  "UZB": (57, 102),  "JOR": (62, 50),   "IRQ": (58, 264),
    "DRC": (60, 67),   "PAN": (39, 83),   "HAI": (90, 21),   "BIH": (74, 28),
    "RSA": (61, 405),  "CZE": (43, 343),  "SWE": (28, 600),  "TUR": (27, 1110),
    "CAN": (31, 2240), "CUR": (90, 3.5),
}


def team_fact(code: str) -> dict:
    """Return {fifa_rank, gdp_usd_b} for a team code, with safe fallbacks."""
    rank, gdp = TEAM_FACTS.get(code, (99, 0.0))
    return {"fifa_rank": rank, "gdp_usd_b": gdp}
