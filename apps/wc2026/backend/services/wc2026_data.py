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
