from app.face.matching import Hit, best_match, rank_people


def test_collapses_samples_into_one_entry_per_person():
    hits = [Hit("ana", 0.81), Hit("ana", 0.74), Hit("bruno", 0.69), Hit("ana", 0.40)]

    ranked = rank_people(hits, floor=0.45)

    assert [(r.person_id, r.similarity, r.support) for r in ranked] == [("ana", 0.81, 2), ("bruno", 0.69, 1)]


def test_support_breaks_ties_between_equal_scores():
    hits = [Hit("solo", 0.8), Hit("crowd", 0.8), Hit("crowd", 0.7)]

    assert rank_people(hits, floor=0.5)[0].person_id == "crowd"


def test_hits_below_floor_are_ignored():
    assert rank_people([Hit("ana", 0.3)], floor=0.45) == []


def test_limit_caps_candidates():
    hits = [Hit(str(i), 0.5 + i / 100) for i in range(10)]

    assert len(rank_people(hits, floor=0.45, limit=3)) == 3


def test_best_match_requires_threshold():
    ranked = rank_people([Hit("ana", 0.68)], floor=0.45)

    assert best_match(ranked, threshold=0.70) is None
    assert best_match(ranked, threshold=0.65).person_id == "ana"


def test_best_match_of_nothing_is_none():
    assert best_match([], threshold=0.7) is None
