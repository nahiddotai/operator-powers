#!/usr/bin/env python3

import re
import sys
from pathlib import Path


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 scripts/check_thread.py /absolute/path/to/thread.md")

path = Path(sys.argv[1])
if not path.is_file():
    raise SystemExit(f"File not found: {path}")

text = path.read_text()
pattern = re.compile(
    r"^### (Hook|\d+/(\d+)) \((\d+)(?: chars)?\)\n\n(.*?)(?=\n\n### |\Z)",
    re.MULTILINE | re.DOTALL,
)
posts = list(pattern.finditer(text))
if not posts:
    raise SystemExit("No posts found with labels such as Hook (207 chars) and 2/9 (365 chars)")

failures: list[str] = []
expected_total = len(posts)

for index, match in enumerate(posts, start=1):
    label = match.group(1)
    stated_total = match.group(2)
    stated_count = int(match.group(3))
    body = match.group(4).strip()
    actual_count = len(body)

    expected_label = "Hook" if index == 1 else f"{index}/{expected_total}"
    if label != expected_label:
        fail(f"Post {index}: expected label {expected_label}, found {label}", failures)

    if stated_total and int(stated_total) != expected_total:
        fail(f"Post {index}: label total is {stated_total}, expected {expected_total}", failures)

    if stated_count != actual_count:
        fail(f"Post {index}: displayed count is {stated_count}, actual count is {actual_count}", failures)

    if actual_count >= 500:
        fail(f"Post {index}: {actual_count} characters, must be under 500", failures)

    if "—" in body:
        fail(f"Post {index}: contains an em dash", failures)

    for line_number, line in enumerate(body.splitlines(), start=1):
        stripped = line.strip()
        if stripped.endswith("."):
            fail(f"Post {index}, copy line {line_number}: ends with a full stop", failures)

    nonempty_runs = re.findall(r"\S[^\n]*\n\S", body)
    if nonempty_runs:
        fail(f"Post {index}: sentences or copy lines must have a blank line between them", failures)

    print(f"Post {index}: {actual_count} characters")

if failures:
    print("\nFAILED", file=sys.stderr)
    for message in failures:
        print(f"- {message}", file=sys.stderr)
    raise SystemExit(1)

print(f"\nPASS: {expected_total} posts passed the fifth-g-explainer mechanical checks")

