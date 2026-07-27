import os
import re
import json
from flask import Flask, jsonify, render_template
from docx import Document

app = Flask(__name__)

# Quiz banks live under bank/. Which .docx is served is chosen by the "active"
# entry in bank/config.json, so the bank can be switched without code changes.
BANK_DIR = os.environ.get("BANK_DIR", "bank")
CONFIG_PATH = os.path.join(BANK_DIR, "config.json")
FALLBACK_DOCX = "aws/AWS-Solution-Architect-Professional.docx"


def resolve_docx_path() -> str:
    """Pick the active quiz docx.

    Order of precedence:
      1. QUIZ_DOCX env var (explicit override, used by Docker/deploys).
      2. The "active" path in bank/config.json (relative to bank/).
      3. FALLBACK_DOCX under bank/.
    Resolved on every request so editing config.json takes effect without a
    restart — matching the existing "re-parse on every call" behaviour.
    """
    env = os.environ.get("QUIZ_DOCX")
    if env:
        return env
    try:
        with open(CONFIG_PATH, encoding="utf-8") as fh:
            active = json.load(fh).get("active")
        if active:
            return os.path.join(BANK_DIR, active)
    except (OSError, json.JSONDecodeError):
        pass
    return os.path.join(BANK_DIR, FALLBACK_DOCX)

# Option lines look like "A. text". The source is inconsistent — some options
# are malformed as "B..Remove" or "C.Modify" (missing the space after the dot),
# so the whitespace is optional and any leading dots/spaces are stripped below.
_OPTION_RE = re.compile(r"^([A-F])\.\s*(.+)$", re.DOTALL)


def _channel_dominant(rgb_hex: str, dominant: str) -> bool:
    """True if the `dominant` channel ('r' or 'g') clearly outweighs the other
    two -- i.e. the color reads as "red" or "green" to a human, even if it
    isn't the exact original swatch. Different docx edits/authors don't all
    pick the same red/green (e.g. FF0000 vs FF4000, or 188038 vs 158466), and
    an exact hex match silently drops those questions instead of flagging
    them as answered."""
    try:
        r, g, b = int(rgb_hex[0:2], 16), int(rgb_hex[2:4], 16), int(rgb_hex[4:6], 16)
    except (ValueError, IndexError):
        return False
    if dominant == "r":
        return r >= 0x99 and (r - g) >= 0x50 and (r - b) >= 0x30
    if dominant == "g":
        return g >= 0x50 and (g - r) >= 0x30 and g > b
    return False


def _has_color(para, dominant: str) -> bool:
    for run in para.runs:
        try:
            color = run.font.color.rgb
            if color and _channel_dominant(str(color).upper(), dominant):
                return True
        except Exception:
            pass
    return False


def _has_red(para) -> bool:
    # Red-ish font marks the correct answer choice.
    return _has_color(para, "r")


def _has_green(para) -> bool:
    # Green-ish font marks explanation text shown after the answer is submitted.
    return _has_color(para, "g")


# Leading answer letter(s) in the explanation block, e.g. the "A. kms:..." line
# that opens "Explanation:\nA. kms:GenerateDataKey\nHere's why...". Only the
# contiguous letter lines at the very top are the answer(s); the per-option
# "Why the others are wrong" list further down is intentionally excluded.
_EXPL_LETTER_RE = re.compile(r"^([A-F])[.\s]")


def _answer_letters_from_explanation(expl_lines: list) -> list:
    letters, started = [], False
    for line in expl_lines:
        s = line.strip()
        if not s or re.match(r"(?i)^explanation\b[:\s]*$", s):
            continue
        m = _EXPL_LETTER_RE.match(s)
        if m:
            letters.append(m.group(1))
            started = True
        elif started:
            break  # first prose line after the answer block ends it
    return letters


def parse_questions(path: str, keep_invalid: bool = False) -> list:
    doc = Document(path)
    questions: list = []
    q_lines: list = []
    choices: list = []
    expl_lines: list = []  # green-font explanation paragraphs (optional)

    def flush():
        if q_lines and choices:
            # Self-heal: if the source forgot to red-mark the correct choice but
            # provided a green explanation, recover the answer from the letter(s)
            # the explanation opens with. Keeps questions from silently vanishing
            # on every docx re-upload.
            if not any(c["correct"] for c in choices) and expl_lines:
                answers = set(_answer_letters_from_explanation(expl_lines))
                for c in choices:
                    if c["letter"] in answers:
                        c["correct"] = True
            questions.append(
                {
                    "id": len(questions),
                    "text": "\n".join(q_lines),
                    "choices": [c.copy() for c in choices],
                    # None when the question has no explanation, so the UI can
                    # skip the explanation section entirely.
                    "explanation": "\n".join(expl_lines).strip() or None,
                }
            )

    def make_choice(letter, m, para):
        return {
            "letter": letter,
            "text": m.group(2).lstrip(". "),  # tidy malformed "B..Remove"
            "correct": _has_red(para),
        }

    # True once a blank line (or the explanation) has closed the choices
    # section, so the next plain line begins a new question rather than
    # continuing the last choice.
    choices_done = False

    def reset():
        nonlocal q_lines, choices, expl_lines, choices_done
        q_lines, choices, expl_lines, choices_done = [], [], [], False

    for para in doc.paragraphs:
        text = para.text.strip()

        # Green text = explanation block following the choices. Checked first so
        # an explanation line is never mistaken for a choice or new question.
        if text and choices and _has_green(para):
            expl_lines.append(text)
            continue

        if not text:
            # A blank line closes the choices section. There are no blank lines
            # inside a single choice's multi-paragraph content (e.g. a JSON
            # block), so this reliably marks the end of the choices — the
            # question itself is flushed when the next one starts.
            if choices and not expl_lines:
                choices_done = True
            continue

        m = _OPTION_RE.match(text)

        if m:
            letter = m.group(1)
            if not choices:
                # First choice of this question.
                choices.append(make_choice(letter, m, para))
            elif not expl_lines and letter > choices[-1]["letter"]:
                # Next option in sequence. The source sometimes puts a stray
                # blank line between options, so treat that blank as spurious
                # and keep collecting choices.
                choices_done = False
                choices.append(make_choice(letter, m, para))
            else:
                # Letter went backwards (e.g. "A." after "D.") or an option
                # appeared after the explanation → the blank separator before a
                # new question is missing in the source. Any lines appended to
                # the last choice are really the next question's stem; recover
                # them.
                tail = choices[-1]["text"].split("\n")
                choices[-1]["text"] = tail[0]
                flush()
                reset()
                q_lines.extend(tail[1:])
                choices.append(make_choice(letter, m, para))
        elif not choices:
            # Still reading the question stem (before the first choice).
            q_lines.append(text)
        elif choices_done or expl_lines:
            # First content after the choices/explanation ended → next question.
            flush()
            reset()
            q_lines.append(text)
        else:
            # Any other line inside the choices section continues the current
            # choice — this is what keeps multi-line JSON policy blocks attached
            # to their option instead of splitting into bogus questions.
            choices[-1]["text"] += "\n" + text
            if _has_red(para):
                choices[-1]["correct"] = True

    flush()  # handle last question in file

    # keep_invalid=True is used by /api/validate to surface questions that would
    # otherwise be dropped: each is tagged "incomplete" instead of removed.
    if keep_invalid:
        for i, q in enumerate(questions):
            q["incomplete"] = not any(c["correct"] for c in q["choices"])
            q["id"] = i
        return questions

    # Drop questions where no answer is marked correct — these are parse
    # artifacts from multi-paragraph answer choices that contain blank lines,
    # or questions the source neither red-marked nor explained.
    valid = [q for q in questions if any(c["correct"] for c in q["choices"])]

    # Re-sequence IDs after filtering
    for i, q in enumerate(valid):
        q["id"] = i

    return valid


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/questions")
def get_questions():
    # Re-parse on every call so an updated docx is picked up dynamically.
    # Ordering (shuffle vs document order) is handled client-side by the toggle.
    questions = parse_questions(resolve_docx_path())
    return jsonify(questions)


@app.route("/api/info")
def get_info():
    path = resolve_docx_path()
    questions = parse_questions(path)
    return jsonify({"total": len(questions), "source": os.path.basename(path)})


@app.route("/api/validate")
def validate():
    """Report questions that would be dropped (no correct answer detectable),
    so an updated bank can be checked before questions silently disappear. A
    question is incomplete when it has neither a red-marked choice nor a green
    explanation naming the answer. Add a red mark or an explanation to fix."""
    path = resolve_docx_path()
    all_q = parse_questions(path, keep_invalid=True)
    incomplete = [
        {
            "stem": q["text"].splitlines()[0][:200],
            "choices": [c["letter"] for c in q["choices"]],
            "has_explanation": bool(q["explanation"]),
        }
        for q in all_q
        if q["incomplete"]
    ]
    served = sum(1 for q in all_q if not q["incomplete"])
    return jsonify(
        {
            "source": os.path.basename(path),
            "parsed_blocks": len(all_q),
            "served": served,
            "incomplete_count": len(incomplete),
            "incomplete": incomplete,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6000, debug=False)
