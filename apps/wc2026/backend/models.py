"""ORM models for the World Cup 2026 wall-chart."""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from database import Base


class Team(Base):
    __tablename__ = "teams"
    id            = Column(Integer, primary_key=True)
    code          = Column(String(3), unique=True, index=True, nullable=False)  # MEX, KOR, ...
    name          = Column(String, nullable=False)
    # flagcdn identifier — usually ISO-3166 alpha-2 ('mx', 'kr') but the home
    # nations need regional codes ('gb-sct', 'gb-eng', 'gb-wls'), so keep it wide.
    iso2          = Column(String(16))
    group_letter  = Column(String(1), index=True)      # A..L
    confederation = Column(String)                     # CONMEBOL, UEFA, ...
    venue_image   = Column(String)                     # optional

    players = relationship("Player", back_populates="team", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"
    id            = Column(Integer, primary_key=True)
    team_id       = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    jersey_number = Column(Integer)
    name          = Column(String, nullable=False)
    position      = Column(String(3))      # GK, DF, MF, FW
    age           = Column(Integer)
    caps          = Column(Integer, default=0)
    intl_goals    = Column(Integer, default=0)
    club          = Column(String)
    is_captain    = Column(Boolean, default=False)
    wc_goals      = Column(Integer, default=0)         # updated as tournament progresses

    team = relationship("Team", back_populates="players")


class Fixture(Base):
    """Group-stage match. One row per scheduled fixture."""
    __tablename__ = "fixtures"
    id              = Column(Integer, primary_key=True)
    group_letter    = Column(String(1), index=True)
    match_no        = Column(Integer)                   # 1..6 within a group
    home_team_id    = Column(Integer, ForeignKey("teams.id"), index=True)
    away_team_id    = Column(Integer, ForeignKey("teams.id"), index=True)
    home_score      = Column(Integer)
    away_score      = Column(Integer)
    status          = Column(String, default="scheduled")  # scheduled | live | finished
    kickoff         = Column(DateTime(timezone=True))
    venue           = Column(String)
    espn_event_id   = Column(String, index=True)
    updated_at      = Column(DateTime(timezone=True),
                             server_default=func.now(), onupdate=func.now())

    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])

    __table_args__ = (
        UniqueConstraint("group_letter", "match_no", name="uq_group_match"),
    )


class KnockoutMatch(Base):
    """Bracket slot — round_code: r32, r16, qf, sf, third, final."""
    __tablename__ = "knockout_matches"
    id              = Column(Integer, primary_key=True)
    round_code      = Column(String, index=True)
    slot            = Column(Integer)                   # order within round
    home_label      = Column(String)                    # 'Winner R32 Match 1' until decided
    away_label      = Column(String)
    home_team_id    = Column(Integer, ForeignKey("teams.id"), nullable=True)
    away_team_id    = Column(Integer, ForeignKey("teams.id"), nullable=True)
    home_score      = Column(Integer)
    away_score      = Column(Integer)
    winner_team_id  = Column(Integer, ForeignKey("teams.id"), nullable=True)
    status          = Column(String, default="scheduled")
    kickoff         = Column(DateTime(timezone=True))
    venue           = Column(String)
    espn_event_id   = Column(String, index=True)
    updated_at      = Column(DateTime(timezone=True),
                             server_default=func.now(), onupdate=func.now())

    home_team   = relationship("Team", foreign_keys=[home_team_id])
    away_team   = relationship("Team", foreign_keys=[away_team_id])
    winner_team = relationship("Team", foreign_keys=[winner_team_id])

    __table_args__ = (
        UniqueConstraint("round_code", "slot", name="uq_round_slot"),
    )
