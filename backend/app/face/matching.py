from dataclasses import dataclass


@dataclass(frozen=True)
class Hit:
    person_id: str
    similarity: float


@dataclass(frozen=True)
class Ranked:
    person_id: str
    similarity: float
    support: int


def rank_people(hits: list[Hit], floor: float, limit: int = 3) -> list[Ranked]:
    """Collapse per-sample hits into one entry per person, best first.

    A person's score is their best sample. `support` counts how many of their
    samples cleared the floor, which breaks ties between near-identical scores.
    """
    best: dict[str, float] = {}
    support: dict[str, int] = {}
    for hit in hits:
        if hit.similarity < floor:
            continue
        best[hit.person_id] = max(best.get(hit.person_id, 0.0), hit.similarity)
        support[hit.person_id] = support.get(hit.person_id, 0) + 1
    ranked = [Ranked(pid, round(score, 4), support[pid]) for pid, score in best.items()]
    ranked.sort(key=lambda r: (r.similarity, r.support), reverse=True)
    return ranked[:limit]


def best_match(ranked: list[Ranked], threshold: float) -> Ranked | None:
    if ranked and ranked[0].similarity >= threshold:
        return ranked[0]
    return None
