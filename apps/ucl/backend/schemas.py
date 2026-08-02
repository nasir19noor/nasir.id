"""Pydantic response schemas for the ucl API."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ─── Team ─────────────────────────────────────────────────────────

class TeamBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:   int
    code: Optional[str] = None
    name: str
    logo: Optional[str] = None


# ─── Fixture / Standings ──────────────────────────────────────────

class FixtureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:            int
    round_code:    str
    matchday:      Optional[int]
    home:          TeamBase
    away:          TeamBase
    home_score:    Optional[int]
    away_score:    Optional[int]
    home_shootout: Optional[int] = None
    away_shootout: Optional[int] = None
    status:        str
    kickoff:       Optional[datetime]
    venue:         Optional[str]


class StandingRow(BaseModel):
    position: int
    team:     TeamBase
    played:   int = 0
    won:      int = 0
    drawn:    int = 0
    lost:     int = 0
    gf:       int = 0
    ga:       int = 0
    gd:       int = 0
    points:   int = 0
    # League-phase qualification zone: direct (1-8), playoff (9-24), out (25-36)
    zone:     str = "direct"


class TableOut(BaseModel):
    standings: List[StandingRow]
    matchdays: int   # highest matchday seen so far (0 before the draw)


# ─── Knockout ties (two legs + aggregate) ─────────────────────────

class TieOut(BaseModel):
    team_a:      TeamBase
    team_b:      TeamBase
    legs:        List[FixtureOut]          # in kickoff order (final: one leg)
    agg_a:       Optional[int] = None      # aggregate over finished/live legs
    agg_b:       Optional[int] = None
    winner:      Optional[TeamBase] = None # set once the tie is decided
    decided:     bool = False


class RoundOut(BaseModel):
    round_code: str                        # playoff | r16 | qf | sf | final
    label:      str
    ties:       List[TieOut]


# ─── Top scorers ──────────────────────────────────────────────────

class ScorerOut(BaseModel):
    rank:   int
    player: str
    team:   TeamBase
    goals:  int


# ─── Health / status ──────────────────────────────────────────────

class StatusOut(BaseModel):
    seeded:       bool
    teams:        int
    players:      int
    fixtures:     int
    last_refresh: Optional[datetime] = None
