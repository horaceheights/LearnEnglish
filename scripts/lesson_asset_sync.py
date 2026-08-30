from __future__ import annotations

import filecmp
from pathlib import Path
import shutil


def copy_lesson_image_if_changed(source: Path, destination: Path) -> bool:
    """Copy when bytes differ, including same-size semantic replacements."""
    if destination.exists() and filecmp.cmp(source, destination, shallow=False):
        return False
    shutil.copy2(source, destination)
    return True
