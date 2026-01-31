from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class Question(BaseModel):
    id: str
    domain: str
    question: str
    why_it_matters: str
    good_answer_signals: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)


class PainPoint(BaseModel):
    title: str
    evidence: str
    impact: str
    priority: int


class OptimizationSuggestion(BaseModel):
    title: str
    actions: List[str] = Field(default_factory=list)
    priority: int


class ImprovementDirection(BaseModel):
    direction: str
    roadmap_30d: List[str] = Field(default_factory=list)
    roadmap_90d: List[str] = Field(default_factory=list)
    priority: int


class AnalysisResult(BaseModel):
    pain_points: List[PainPoint] = Field(default_factory=list)
    optimization_suggestions: List[OptimizationSuggestion] = Field(default_factory=list)
    improvement_directions: List[ImprovementDirection] = Field(default_factory=list)
