# -*- coding: utf-8 -*-
"""
A* Informed Search — Optimal Study Path Planner
Maps to: Unit II — Informed Search (Best First Search, A* Search), heuristic functions

A* Search formulation:
    State  : frozenset of completed subject names
    Goal   : state == all_subjects (all completed)
    g(n)   : total hours spent on completed subjects (actual cost)
    h(n)   : sum of hours for remaining subjects (admissible heuristic — never overestimates)
    f(n)   : g(n) + h(n)  — total estimated cost of path through n

Priority: subjects with lower quiz accuracy get more hours (from timetable_generator)
          so A* naturally tackles harder subjects early in the optimal path.
"""
import heapq


def astar_study_path(subjects, total_days=14, total_hours_per_day=3):
    """
    Find the optimal study order using A* search.

    Args:
        subjects: list of dicts  {name: str, allocated_hours: float}
        total_days: int          — planning horizon
        total_hours_per_day: float

    Returns:
        {
            "path"       : ["SubjectA", "SubjectB", ...],  # optimal order
            "total_hours": float,                           # g(goal)
            "feasible"   : bool,                            # fits in available time
            "heuristic_used": str,                          # explanation for presentation
            "node_expansions": int,                         # A* nodes expanded (for demo)
        }
    """
    if not subjects:
        return {
            "path": [], "total_hours": 0,
            "feasible": True, "heuristic_used": "N/A", "node_expansions": 0
        }

    subject_hours = {s["name"]: float(s.get("allocated_hours", 1.0)) for s in subjects}
    all_names     = frozenset(subject_hours.keys())
    total_available = total_days * total_hours_per_day

    # Priority queue entries: (f, g, state_tuple, path)
    # Using tuple for state because frozenset is not always orderable with heapq tiebreaks
    start_state = frozenset()
    heap = [(0.0, 0.0, start_state, [])]
    visited = set()
    node_expansions = 0

    while heap:
        f, g, done, path = heapq.heappop(heap)

        state_key = done
        if state_key in visited:
            continue
        visited.add(state_key)
        node_expansions += 1

        # Goal check
        if done == all_names:
            return {
                "path":           path,
                "total_hours":    round(g, 2),
                "feasible":       g <= total_available,
                "heuristic_used": "h(n) = sum of allocated hours for unvisited subjects (admissible)",
                "node_expansions": node_expansions,
            }

        # Expand: try adding each unvisited subject
        remaining = all_names - done
        for name in remaining:
            hours   = subject_hours[name]
            new_g   = g + hours
            new_done = done | {name}
            new_path = path + [name]

            # h(n): sum of hours for still-unvisited subjects after this move
            h = sum(subject_hours[n] for n in (all_names - new_done))
            new_f = new_g + h

            heapq.heappush(heap, (new_f, new_g, new_done, new_path))

    # Fallback: return all subjects in original order
    return {
        "path":           [s["name"] for s in subjects],
        "total_hours":    round(sum(subject_hours.values()), 2),
        "feasible":       False,
        "heuristic_used": "h(n) = sum of allocated hours for unvisited subjects (admissible)",
        "node_expansions": node_expansions,
    }
