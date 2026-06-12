"""Pydantic response schemas for the wc2026 API."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ─── Team / Player ─────────────────────────────────────────────────

class TeamBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:            int
    code:          str
    name:          str
    iso2:          Optional[str] = None
    group_letter:  Optional[str] = None
    confederation: Optional[str] = None


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:            int
    jersey_number: Optional[int]
    name:          str
    position:      Optional[str]
    age:           Optional[int]
    caps:          int = 0
    intl_goals:    int = 0
    club:          Optional[str]
    is_captain:    bool = False
    wc_goals:      int = 0


class SquadOut(BaseModel):
    team:    TeamBase
    players: List[PlayerOut]


# ─── Fixture / Group ──────────────────────────────────────────────

class FixtureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:           int
    group_letter: Optional[str]
    match_no:     Optional[int]
    home:         TeamBase
    away:         TeamBase
    home_score:   Optional[int]
    away_score:   Optional[int]
    status:       str
    kickoff:      Optional[datetime]
    venue:        Optional[str]


class StandingRow(BaseModel):
    team:    TeamBase
    played:  int = 0
    won:     int = 0
    drawn:   int = 0
    lost:    int = 0
    gf:      int = 0
    ga:      int = 0
    gd:      int = 0
    points:  int = 0


class GroupOut(BaseModel):
    letter:    str
    standings: List[StandingRow]
    fixtures:  List[FixtureOut]


# ─── Knockout ─────────────────────────────────────────────────────

class KnockoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:           int
    round_code:   str
    slot:         int
    home_label:   Optional[str]
    away_label:   Optional[str]
    home:         Optional[TeamBase] = None
    away:         Optional[TeamBase] = None
    home_score:   Optional[int]
    away_score:   Optional[int]
    winner:       Optional[TeamBase] = None
    status:       str
    kickoff:      Optional[datetime]
    venue:        Optional[str]


class BracketOut(BaseModel):
    round_code: str
    matches:    List[KnockoutOut]


# ─── Top scorers ──────────────────────────────────────────────────

class ScorerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    rank:    int
    player:  str
    team:    TeamBase
    club:    Optional[str]
    goals:   int


# ─── Health / status ──────────────────────────────────────────────

class StatusOut(BaseModel):
    seeded:           bool
    teams:            int
    players:          int
    fixtures:         int
    knockout_matches: int
    last_refresh:     Optional[datetime] = None
