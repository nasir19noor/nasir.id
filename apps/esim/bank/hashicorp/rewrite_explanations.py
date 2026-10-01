"""
Rewrite HashiCorp Vault Associate exam question explanations to be concise.

Approach:
- Parse the document ONCE, storing XML element references (not indices)
- For each question, compute new explanation lines
- Replace old explanation elements with new ones using XML operations
- Save the document
"""

import re
import sys
import copy
from lxml import etree
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

sys.stdout.reconfigure(encoding='utf-8')

DOC_PATH = r'D:\Codes\Github\nasir.id\apps\esim\bank\hashicorp\Hashicorp-Vault-Associate-003.docx'

WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


# ──────────────────────────────────────────────────────────────
# XML helpers
# ──────────────────────────────────────────────────────────────

def para_text(p_elem):
    """Return plain text of a paragraph XML element."""
    return ''.join(t.text or '' for t in p_elem.iter(f'{{{WORD_NS}}}t'))


def make_paragraph_elem(text, style_id=None):
    """Create a new <w:p> element with a single run containing text."""
    p = OxmlElement('w:p')
    if style_id:
        pPr = OxmlElement('w:pPr')
        pStyle = OxmlElement('w:pStyle')
        pStyle.set(qn('w:val'), style_id)
        pPr.append(pStyle)
        p.append(pPr)
    r = OxmlElement('w:r')
    t_elem = OxmlElement('w:t')
    t_elem.text = text
    if text and (text[0] == ' ' or text[-1] == ' '):
        t_elem.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    r.append(t_elem)
    p.append(r)
    return p


def set_para_elem_text(p_elem, text):
    """Replace all runs in a <w:p> element with a single run containing text."""
    # Remove existing r, hyperlink, etc. child elements (keep pPr)
    to_remove = []
    for child in p_elem:
        tag = etree.QName(child.tag).localname
        if tag not in ('pPr',):
            to_remove.append(child)
    for child in to_remove:
        p_elem.remove(child)
    # Add new run
    r = OxmlElement('w:r')
    t_elem = OxmlElement('w:t')
    t_elem.text = text
    if text and (text[0] == ' ' or text[-1] == ' '):
        t_elem.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    r.append(t_elem)
    p_elem.append(r)


def insert_after(ref_elem, new_elem):
    """Insert new_elem immediately after ref_elem in the same parent."""
    parent = ref_elem.getparent()
    idx = list(parent).index(ref_elem)
    parent.insert(idx + 1, new_elem)


def remove_elem(elem):
    """Remove elem from its parent."""
    parent = elem.getparent()
    if parent is not None:
        parent.remove(elem)


# ──────────────────────────────────────────────────────────────
# Parse the document into question structures (using element refs)
# ──────────────────────────────────────────────────────────────

def get_all_para_elems(doc):
    """Return list of all <w:p> elements in the document body (flat)."""
    body = doc.element.body
    # Walk all paragraphs including those inside tables etc.
    # For this doc we only care about top-level body paragraphs.
    return [p for p in body if etree.QName(p.tag).localname == 'p']


def parse_questions(all_p_elems):
    """
    Parse question blocks from list of paragraph XML elements.
    Returns list of dicts with element references.
    """
    # Identify question start elements
    q_starts = []  # (index_in_list, question_number, p_elem)
    for i, p in enumerate(all_p_elems):
        t = para_text(p).strip()
        m = re.match(r'^(\d+)\.\s', t)
        if m:
            q_starts.append((i, int(m.group(1)), p))

    questions = []
    for qi, (q_idx, q_num, q_elem) in enumerate(q_starts):
        next_q_idx = q_starts[qi + 1][0] if qi + 1 < len(q_starts) else len(all_p_elems)
        block = all_p_elems[q_idx:next_q_idx]

        expl_label_elem = None
        answer_elem = None
        for p in block:
            t = para_text(p).strip()
            if re.match(r'^Explanation\s*:', t) and expl_label_elem is None:
                expl_label_elem = p
            if t.startswith('Answer:') and answer_elem is None:
                answer_elem = p

        # Explanation body starts right after Answer paragraph
        if answer_elem is not None:
            answer_pos = block.index(answer_elem)
            expl_body_elems = block[answer_pos + 1:]
        elif expl_label_elem is not None:
            expl_pos = block.index(expl_label_elem)
            expl_body_elems = block[expl_pos + 1:]
        else:
            expl_body_elems = []

        # Strip trailing blank elements
        while expl_body_elems and not para_text(expl_body_elems[-1]).strip():
            expl_body_elems = expl_body_elems[:-1]

        # Collect options (A. / B. / …)
        options = {}
        end_of_opts = expl_label_elem if expl_label_elem is not None else answer_elem
        if end_of_opts is not None:
            end_opts_idx = block.index(end_of_opts)
            opt_block = block[1:end_opts_idx]
        else:
            opt_block = block[1:]
        for p in opt_block:
            t = para_text(p).strip()
            m2 = re.match(r'^([A-Z])\.\s+(.*)', t, re.DOTALL)
            if m2:
                options[m2.group(1)] = m2.group(2).strip()

        # Collect existing explanation texts and reference
        expl_texts = [para_text(p).strip() for p in expl_body_elems if para_text(p).strip()]
        ref_url = None
        for t in expl_texts:
            m3 = re.match(r'^Reference:\s*(.*)', t)
            if m3:
                ref_url = m3.group(1).strip()

        questions.append({
            'num':             q_num,
            'q_elem':          q_elem,
            'answer_elem':     answer_elem,
            'expl_label_elem': expl_label_elem,
            'expl_body_elems': expl_body_elems,  # list of XML elements to replace
            'options':         options,
            'expl_texts':      expl_texts,
            'ref_url':         ref_url,
        })

    return questions


# ──────────────────────────────────────────────────────────────
# Build new explanation text
# ──────────────────────────────────────────────────────────────

def get_answer_letters(answer_elem):
    if answer_elem is None:
        return []
    t = para_text(answer_elem).strip()
    m = re.match(r'^Answer:\s*([A-Z]+)', t)
    return list(m.group(1)) if m else []


def clean_body(text):
    """Strip verbose filler phrases from explanation text."""
    fillers = [
        r'(?i)per the (?:vault )?documentation[,.]?\s*',
        r'(?i)according to (?:the )?(?:vault )?docs?[,.]?\s*',
        r'(?i)the docs? (?:state|says?)[,.]?\s*',
        r'(?i)vault documentation (?:states?|says?)[,.]?\s*',
        r'(?i)as (?:per|stated in) (?:the )?docs?[,.]?\s*',
        r'(?i)vault docs?[,.]?\s*',
        r'(?i)this (?:option|choice) is\s+',
    ]
    for f in fillers:
        text = re.sub(f, '', text)
    text = re.sub(r'  +', ' ', text).strip()
    return text


def truncate_to_sentences(text, max_sentences=2, max_chars=250):
    """Truncate text to at most max_sentences sentences and max_chars characters."""
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    # Take up to max_sentences but also respect max_chars
    out_parts = []
    total = 0
    for s in sentences[:max_sentences]:
        if total + len(s) + 1 > max_chars and out_parts:
            break
        out_parts.append(s)
        total += len(s) + 1
    out = ' '.join(out_parts).strip()
    # Remove trailing ellipsis or colon from doc excerpts
    out = re.sub(r'\s*[…\.]{2,}\s*$', '.', out)
    out = re.sub(r':\s*$', '.', out)  # trailing colon -> period
    if out and out[-1] not in '.!?':
        out += '.'
    return out


def extract_summary(expl_texts, correct_letters, options):
    """Extract a 2-3 sentence summary from existing explanation."""
    summary_src = None
    for t in expl_texts:
        if t.startswith('Comprehensive and Detailed'):
            body = re.sub(
                r'^Comprehensive and Detailed[^:]*?(?:Depth|Overview|Analysis|Explanation)\s*',
                '', t, flags=re.IGNORECASE
            ).strip()
            body = re.sub(r'^Comprehensive and Detailed\s+', '', body, flags=re.IGNORECASE).strip()
            if body and len(body) > 30:
                summary_src = body
            break

    if not summary_src:
        for t in expl_texts:
            if t.startswith('Overall Explanation from Vault Docs'):
                body = re.sub(r'^Overall Explanation from Vault Docs\s*:\s*', '', t).strip()
                if body and len(body) > 30:
                    summary_src = body
                break

    if not summary_src:
        # Build minimal summary
        if correct_letters:
            summary_src = f'The correct answer is {", ".join(correct_letters)}.'
        else:
            summary_src = 'See the explanation below.'

    summary_src = clean_body(summary_src)
    return truncate_to_sentences(summary_src, max_sentences=3)


def extract_option_lines(expl_texts, options):
    """Parse existing per-option explanation lines. Returns dict letter->text."""
    result = {}
    for t in expl_texts:
        if t.startswith('Comprehensive and Detailed'):
            continue
        if t.startswith('Overall Explanation from Vault Docs'):
            continue
        if t.startswith('Reference:'):
            continue
        # Match "A: ...", "Option A: ...", or "A. ..." (where A is a letter)
        m = re.match(r'^(?:Option\s+)?([A-Z])\s*[:.]\s*(.*)', t, re.DOTALL)
        if m:
            letter = m.group(1)
            body = m.group(2).strip()
            result[letter] = body
    return result


def build_new_explanation(q):
    """Return list of strings – the new explanation paragraphs."""
    correct_letters = get_answer_letters(q['answer_elem'])
    options = q['options']
    expl_texts = q['expl_texts']

    new_lines = []

    # Summary
    summary = extract_summary(expl_texts, correct_letters, options)
    new_lines.append(summary)

    # Per-option lines
    opt_lines = extract_option_lines(expl_texts, options)

    if options:
        for letter in sorted(options.keys()):
            is_correct = letter in correct_letters
            verdict = 'Correct.' if is_correct else 'Incorrect.'

            if letter in opt_lines and opt_lines[letter]:
                body = opt_lines[letter]
                # Normalize: remove trailing verdict markers before re-appending
                body = re.sub(
                    r'\s*[–\-]?\s*(?:This (?:is|option is|answer is)\s+)?(?:In)?[Cc]orrect\.?\s*$',
                    '', body
                ).strip()
                body = re.sub(r'\s*\((?:In)?[Cc]orrect\)\s*$', '', body).strip()
                body = clean_body(body)
                # If body starts with the option code/text verbatim, strip it
                opt_raw = options.get(letter, '')
                if opt_raw and body.startswith(opt_raw[:40]):
                    body = body[len(opt_raw):].strip()
                    body = body.lstrip('-– ')
                # Truncate long per-option explanations
                body = truncate_to_sentences(body, max_sentences=2, max_chars=200)
                # Remove trailing period before appending verdict
                body = body.rstrip('.')
                if not body:
                    body = options[letter][:100]
                line = f'{letter}: {body}. {verdict}'
            else:
                # No existing per-option text found; use the option text itself
                opt_text = options[letter][:120].rstrip('.')
                line = f'{letter}: {opt_text}. {verdict}'

            new_lines.append(line)

    # Reference
    if q['ref_url']:
        new_lines.append(f'Reference: {q["ref_url"]}')

    return new_lines


# ──────────────────────────────────────────────────────────────
# Apply changes to document XML
# ──────────────────────────────────────────────────────────────

def get_style_id_from_elem(p_elem):
    """Get the style ID of a paragraph element, if any."""
    pPr = p_elem.find(f'{{{WORD_NS}}}pPr')
    if pPr is not None:
        pStyle = pPr.find(f'{{{WORD_NS}}}pStyle')
        if pStyle is not None:
            return pStyle.get(f'{{{WORD_NS}}}val')
    return None


def rewrite_explanation(q, new_lines):
    """
    Replace old explanation body elements with new paragraph elements.
    Uses the answer_elem as the insertion anchor.
    """
    old_elems = q['expl_body_elems']
    answer_elem = q['answer_elem']

    if not old_elems and not new_lines:
        return

    # Determine a style to use for new paragraphs (use first old elem's style or Normal)
    style_id = None
    if old_elems:
        style_id = get_style_id_from_elem(old_elems[0])

    # If we have old elements, we reuse them to preserve position stability
    # Strategy:
    #   - Overwrite first min(old, new) elements with new text
    #   - Delete any leftover old elements
    #   - Insert any extra new elements after the last reused one

    n_old = len(old_elems)
    n_new = len(new_lines)
    reuse = min(n_old, n_new)

    # Overwrite
    for i in range(reuse):
        set_para_elem_text(old_elems[i], new_lines[i])

    # Delete excess old elements
    for i in range(reuse, n_old):
        remove_elem(old_elems[i])

    # Insert extra new elements
    if n_new > n_old:
        if reuse > 0:
            anchor = old_elems[reuse - 1]
        else:
            anchor = answer_elem
        # Insert in reverse so they end up in the right order
        for line in reversed(new_lines[reuse:]):
            new_p = make_paragraph_elem(line, style_id)
            insert_after(anchor, new_p)


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main():
    doc = Document(DOC_PATH)
    # Get all paragraph elements ONCE before any mutation
    all_p_elems = get_all_para_elems(doc)
    print(f'Loaded document: {len(all_p_elems)} paragraphs')

    questions = parse_questions(all_p_elems)
    print(f'Parsed {len(questions)} questions')

    modified = 0
    skipped = 0
    errors = []

    for q in questions:
        if q['answer_elem'] is None:
            print(f'  Q{q["num"]}: no Answer paragraph – skipping')
            skipped += 1
            continue

        try:
            new_lines = build_new_explanation(q)
            rewrite_explanation(q, new_lines)
            modified += 1
            if modified % 50 == 0:
                print(f'  ... processed {modified} questions')
        except Exception as e:
            import traceback
            msg = f'Q{q["num"]}: {e}'
            errors.append(msg)
            print(f'  ERROR: {msg}')
            traceback.print_exc()
            skipped += 1

    print(f'\nDone. Modified: {modified}, Skipped: {skipped}')
    if errors:
        print('Errors:')
        for e in errors:
            print(f'  {e}')

    doc.save(DOC_PATH)
    print(f'Saved to {DOC_PATH}')


if __name__ == '__main__':
    main()
