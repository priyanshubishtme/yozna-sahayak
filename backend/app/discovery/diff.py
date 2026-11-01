"""Diff engine and change classification service for discovered candidates.

Enforces Blueprint Section 4.4, 4.5, and Phase 3 Gate Rules:
- Accurately classifies candidates as new_resource, unchanged, changed_binary, changed_content, duplicate.
- Produces text unified diffs and structured review aids.
"""

import difflib
from typing import Any, Dict, List, Optional, Tuple


class DiffEngine:
    """Computes textual differences and generates structured review summaries between candidate versions."""

    @staticmethod
    def compute_text_diff(
        old_text: str,
        new_text: str,
        from_label: str = "Previous Version",
        to_label: str = "Candidate Version"
    ) -> Dict[str, Any]:
        """Calculates line-by-line unified diff, statistics, and human-readable review aid."""
        old_lines = old_text.splitlines(keepends=True)
        new_lines = new_text.splitlines(keepends=True)

        diff_generator = difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile=from_label,
            tofile=to_label,
            lineterm=""
        )
        diff_lines = list(diff_generator)

        additions = 0
        deletions = 0
        changed_snippets: List[str] = []

        for line in diff_lines:
            if line.startswith("+") and not line.startswith("+++"):
                additions += 1
                if len(changed_snippets) < 8 and line[1:].strip():
                    changed_snippets.append(f"+ {line[1:].strip()[:140]}")
            elif line.startswith("-") and not line.startswith("---"):
                deletions += 1
                if len(changed_snippets) < 8 and line[1:].strip():
                    changed_snippets.append(f"- {line[1:].strip()[:140]}")

        matcher = difflib.SequenceMatcher(None, old_text, new_text)
        similarity = matcher.ratio()

        # Generate machine-assisted summary clearly labelled per Blueprint Section 5.5
        summary_bullets = []
        if additions > 0:
            summary_bullets.append(f"Detected {additions} added line(s) in candidate content.")
        if deletions > 0:
            summary_bullets.append(f"Detected {deletions} removed line(s) from previous document text.")
        if similarity == 1.0:
            summary_bullets.append("Textual content is identical; binary change due to compression or metadata.")
        elif similarity < 0.5:
            summary_bullets.append("Substantial textual revision detected (< 50% textual similarity).")
        else:
            summary_bullets.append(f"Partial revision detected ({round(similarity * 100, 1)}% textual similarity).")

        return {
            "is_identical": old_text == new_text,
            "similarity_ratio": round(similarity, 4),
            "additions_count": additions,
            "deletions_count": deletions,
            "unified_diff": "".join(diff_lines),
            "sample_changes": changed_snippets,
            "machine_summary": {
                "disclaimer": "Machine-generated diff summary as review aid only; human inspection required.",
                "bullets": summary_bullets
            }
        }

    @staticmethod
    def classify_resource(
        is_known_url: bool,
        is_exact_binary_duplicate: bool,
        has_prior_version: bool,
        old_binary_sha256: Optional[str],
        new_binary_sha256: str,
        old_text_sha256: Optional[str],
        new_text_sha256: Optional[str]
    ) -> str:
        """Determines the exact change classification per Blueprint Section 4.4.

        Returns one of:
        - 'unchanged'
        - 'duplicate'
        - 'changed_content'
        - 'changed_binary'
        - 'new_resource'
        """
        # 1. Unchanged: same known URL and identical binary fingerprint
        if is_known_url and old_binary_sha256 == new_binary_sha256:
            return "unchanged"

        # 2. Duplicate: exact binary hash already stored, but seen under a different URL
        if not is_known_url and is_exact_binary_duplicate:
            return "duplicate"

        # 3. Known resource with altered bytes
        if has_prior_version and old_binary_sha256 != new_binary_sha256:
            # If normalized text also differs, it's a substantive content change
            if old_text_sha256 and new_text_sha256 and old_text_sha256 != new_text_sha256:
                return "changed_content"
            # If text matches but binary bytes changed (PDF compression, headers, timestamps)
            return "changed_binary"

        # 4. First time seeing this canonical resource
        return "new_resource"
