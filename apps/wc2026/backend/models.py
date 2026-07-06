"""ORM models for the World Cup 2026 wall-chart."""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, func,
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
    home_shootout   = Column(Integer)   # penalty-shootout score, if it went to pens
    away_shootout   = Column(Integer)
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


class PageView(Base):
    """One row per public page view — populated by the frontend beacon."""
    __tablename__ = "page_views"
    id          = Column(Integer, primary_key=True)
    timestamp   = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    path        = Column(String, index=True)
    referrer    = Column(String)
    ip            = Column(String, index=True)
    user_agent    = Column(String)
    country       = Column(String(8), index=True)  # ISO code, e.g. "ID"
    country_name  = Column(String)                 # full name, e.g. "Indonesia"
    region        = Column(String)                 # e.g. "East Java"
    city          = Column(String)                 # e.g. "Jember"
    timezone      = Column(String)                 # e.g. "Asia/Jakarta"
    isp           = Column(String)                 # e.g. "Telkom Indonesia"
    browser       = Column(String)
    os            = Column(String)
    device        = Column(String)                 # Mobile | Tablet | PC | Bot

    __table_args__ = (
        Index("ix_page_views_path_ts", "path", "timestamp"),
    )


class Prediction(Base):
    """One AI prediction artifact per (WIB date, kind)."""
    __tablename__ = "predictions"
    id              = Column(Integer, primary_key=True)
    prediction_date = Column(String(10), index=True)   # YYYY-MM-DD (WIB)
    kind            = Column(String, index=True)        # match_winners | top_scorer
    payload         = Column(String)                    # JSON string
    model           = Column(String)
    cache_read      = Column(Integer, default=0)        # tokens served from cache
    generated_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("prediction_date", "kind", name="uq_pred_date_kind"),
    )


class MatchPredictionRow(Base):
    """One AI prediction per fixture — upserted while the match is still
    scheduled, then frozen once it kicks off. Keyed by fixture so history
    accumulates per match instead of being overwritten per day."""
    __tablename__ = "match_predictions"
    id               = Column(Integer, primary_key=True)
    fixture_id       = Column(Integer, ForeignKey("fixtures.id"), unique=True, index=True)
    predicted_winner = Column(String)
    home_win_pct     = Column(Integer)
    draw_pct         = Column(Integer)
    away_win_pct     = Column(Integer)
    likely_score     = Column(String)
    confidence       = Column(String)
    reasoning        = Column(String)
    model            = Column(String)
    predicted_at     = Column(DateTime(timezone=True),
                              server_default=func.now(), onupdate=func.now())


class MatchHighlight(Base):
    """One FolaPlay 'FULL MATCH HIGHLIGHT' video per tie, keyed by the two team
    codes sorted alphabetically (e.g. 'ENG-MEX'). Refreshed hourly alongside the
    ESPN pull, so new uploads surface automatically."""
    __tablename__ = "match_highlights"
    pair_key   = Column(String, primary_key=True)
    video_id   = Column(String, nullable=False)
    title      = Column(String)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())
