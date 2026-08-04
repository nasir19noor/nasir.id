"""ORM models for the UEFA Champions League 2026/27 wall-chart.

Unlike wc2026 (fixed 48-team draw shipped as a constant), the UCL field is
discovered dynamically: teams are upserted from ESPN scoreboard events as
fixtures appear, keyed by ESPN's stable team id. The league-phase draw lands
in late August 2026 and fixtures materialise then.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from database import Base


class Team(Base):
    __tablename__ = "teams"
    id       = Column(Integer, primary_key=True)
    espn_id  = Column(String(16), unique=True, index=True, nullable=False)
    code     = Column(String(8), index=True)   # ESPN abbreviation: RMA, BAY, ...
    name     = Column(String, nullable=False)
    logo     = Column(String)                  # a.espncdn.com club crest URL
    color    = Column(String(8))               # primary kit color hex from ESPN
    # Home ground, learned from the venue block of this club's home fixtures
    # (the final is skipped — neutral venue).
    venue    = Column(String)
    city     = Column(String)
    country  = Column(String)

    players = relationship("Player", back_populates="team", cascade="all, delete-orphan")


class Player(Base):
    """Scorer rows only — no full squads. Created on demand when a goal is
    attributed, keyed by (team, normalized name)."""
    __tablename__ = "players"
    id        = Column(Integer, primary_key=True)
    team_id   = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    name      = Column(String, nullable=False)
    norm_name = Column(String, index=True)     # diacritic-insensitive match key
    goals     = Column(Integer, default=0)

    team = relationship("Team", back_populates="players")

    __table_args__ = (
        UniqueConstraint("team_id", "norm_name", name="uq_player_team_name"),
    )


class Fixture(Base):
    """Every match of the season — league phase and knockout — in one table.

    round_code: league | playoff | r16 | qf | sf | final (ESPN season.slug).
    matchday:   1..8 for league-phase fixtures (derived by clustering match
                dates, since ESPN's soccer scoreboard has no week field).
    Knockout ties (two legs) are grouped at the API layer by (round, team pair).
    """
    __tablename__ = "fixtures"
    id            = Column(Integer, primary_key=True)
    round_code    = Column(String(8), index=True, default="league")
    matchday      = Column(Integer, index=True)
    home_team_id  = Column(Integer, ForeignKey("teams.id"), index=True)
    away_team_id  = Column(Integer, ForeignKey("teams.id"), index=True)
    home_score    = Column(Integer)
    away_score    = Column(Integer)
    home_shootout = Column(Integer)   # final can go to penalties
    away_shootout = Column(Integer)
    status        = Column(String, default="scheduled")  # scheduled | live | finished
    kickoff       = Column(DateTime(timezone=True))
    venue         = Column(String)
    espn_event_id = Column(String, unique=True, index=True)
    updated_at    = Column(DateTime(timezone=True),
                           server_default=func.now(), onupdate=func.now())

    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
