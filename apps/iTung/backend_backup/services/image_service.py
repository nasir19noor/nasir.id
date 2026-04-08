"""
Generates math diagram images using matplotlib (programmatic, zero AI tokens),
verifies with Claude Haiku vision, then uploads to Amazon S3.

Supported types: number_line, rectangle, square, triangle, circle, angle, fraction,
                 coordinate_plane, bar_chart, 3d_shape, trapezoid, function_graph,
                 clock, scale, venn_diagram, pie_chart, factor_tree, matrix,
                 ruler, money, tree_diagram, number_grid, custom
"""
import io, os, uuid, base64, requests as _requests, math
from datetime import datetime
import anthropic

import boto3
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.patches as patches
from matplotlib.patches import FancyArrowPatch, Arc, Wedge
import numpy as np

# ─── AWS / OpenRouter config ──────────────────────────────────────

_s3 = None

def _get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'ap-southeast-1'),
        )
    return _s3

BUCKET        = os.getenv('S3_BUCKET_NAME')
CDN_BASE      = os.getenv('S3_CDN_BASE', '')
CLAUDE_MODEL  = os.getenv('CLAUDE_MODEL', 'claude-haiku-4-5-20251001')

_claude = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

MAX_IMAGE_RETRIES = 1  # matplotlib is accurate; only retry once for visual issues


# ─── S3 helpers ───────────────────────────────────────────────────

def _fig_to_bytes(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=120, facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _upload(image_bytes: bytes, topic: str = "general") -> str | None:
    if not image_bytes:
        return None
    try:
        buf = io.BytesIO(image_bytes)
        topic_slug = topic.replace(" ", "-").lower()
        now = datetime.now()
        key = f"questions/{topic_slug}/{now.strftime('%Y/%m/%d')}/{uuid.uuid4()}.png"
        _get_s3().upload_fileobj(buf, BUCKET, key, ExtraArgs={'ContentType': 'image/png'})
        base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
        return f"{base}/{key}"
    except Exception as e:
        print(f"[image_service] S3 upload failed: {e}")
        return None


# ─── Matplotlib draw functions ────────────────────────────────────

def _draw_number_line(params: dict, question: str = "") -> bytes:
    start  = params.get('start', 0)
    end    = params.get('end', 20)
    marked = params.get('marked', [])

    fig, ax = plt.subplots(figsize=(8, 2))
    ax.set_xlim(start - 1, end + 1)
    ax.set_ylim(-1, 1)
    ax.axhline(0, color='black', linewidth=2)
    ax.annotate('', xy=(end + 0.8, 0), xytext=(start - 0.8, 0),
                arrowprops=dict(arrowstyle='->', color='black', lw=2))
    step = max(1, (end - start) // 10)
    for x in range(start, end + 1, step):
        ax.plot(x, 0, 'k|', markersize=10)
        ax.text(x, -0.4, str(x), ha='center', va='top', fontsize=10)
    for m in marked:
        ax.plot(m, 0, 'ro', markersize=10, zorder=5)
        ax.text(m, 0.35, str(m), ha='center', va='bottom', fontsize=11, color='red', fontweight='bold')
    ax.axis('off')
    ax.set_title(params.get('given_info', ''), fontsize=10, pad=4)
    return _fig_to_bytes(fig)


def _draw_rectangle(params: dict, question: str = "") -> bytes:
    w = params.get('width', 4)
    h = params.get('height', 3)
    fig, ax = plt.subplots(figsize=(5, 4))
    rect = patches.Rectangle((0.5, 0.5), w, h, linewidth=2, edgecolor='steelblue', facecolor='lightblue', alpha=0.4)
    ax.add_patch(rect)
    ax.text(0.5 + w / 2, 0.5 - 0.3, f'{w} cm', ha='center', va='top', fontsize=12, fontweight='bold')
    ax.text(0.5 - 0.3, 0.5 + h / 2, f'{h} cm', ha='right', va='center', fontsize=12, fontweight='bold', rotation=90)
    ax.set_xlim(0, w + 1)
    ax.set_ylim(0, h + 1)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_square(params: dict, question: str = "") -> bytes:
    s = params.get('side', 4)
    fig, ax = plt.subplots(figsize=(4, 4))
    rect = patches.Rectangle((0.5, 0.5), s, s, linewidth=2, edgecolor='steelblue', facecolor='lightblue', alpha=0.4)
    ax.add_patch(rect)
    ax.text(0.5 + s / 2, 0.3, f'{s} cm', ha='center', va='top', fontsize=12, fontweight='bold')
    ax.text(0.3, 0.5 + s / 2, f'{s} cm', ha='right', va='center', fontsize=12, fontweight='bold', rotation=90)
    ax.set_xlim(0, s + 1)
    ax.set_ylim(0, s + 1)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_triangle(params: dict, question: str = "") -> bytes:
    pts = params.get('points', [[0.5, 0.5], [4.5, 0.5], [2.5, 4]])
    given = params.get('given_info', '')
    fig, ax = plt.subplots(figsize=(5, 5))
    xs = [p[0] for p in pts] + [pts[0][0]]
    ys = [p[1] for p in pts] + [pts[0][1]]
    ax.plot(xs, ys, 'b-', linewidth=2)
    ax.fill(xs, ys, alpha=0.15, color='steelblue')
    labels = ['A', 'B', 'C']
    for i, (px, py) in enumerate(pts):
        offset = 0.25
        ax.text(px, py - offset if py == min(p[1] for p in pts) else py + offset,
                labels[i], ha='center', fontsize=13, fontweight='bold')
    if given:
        ax.set_title(given, fontsize=10, wrap=True)
    margin = 1
    ax.set_xlim(min(xs) - margin, max(xs) + margin)
    ax.set_ylim(min(ys) - margin, max(ys) + margin)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_circle(params: dict, question: str = "") -> bytes:
    r = params.get('radius', 3)
    fig, ax = plt.subplots(figsize=(5, 5))
    circle = plt.Circle((0, 0), r, color='steelblue', fill=True, alpha=0.2, linewidth=2)
    ax.add_patch(circle)
    circle2 = plt.Circle((0, 0), r, color='steelblue', fill=False, linewidth=2)
    ax.add_patch(circle2)
    ax.plot([0, r], [0, 0], 'r-', linewidth=2)
    ax.text(r / 2, 0.15, f'r = {r} cm', ha='center', fontsize=12, color='red', fontweight='bold')
    ax.plot(0, 0, 'ko', markersize=5)
    ax.set_xlim(-r - 1, r + 1)
    ax.set_ylim(-r - 1, r + 1)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_angle(params: dict, question: str = "") -> bytes:
    deg = params.get('degrees', 60)
    fig, ax = plt.subplots(figsize=(4, 4))
    length = 3
    ax.annotate('', xy=(length, 0), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='black', lw=2))
    rad = math.radians(deg)
    ax.annotate('', xy=(length * math.cos(rad), length * math.sin(rad)), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='black', lw=2))
    arc = Arc((0, 0), 1.2, 1.2, angle=0, theta1=0, theta2=deg, color='red', lw=2)
    ax.add_patch(arc)
    mid_rad = math.radians(deg / 2)
    ax.text(0.9 * math.cos(mid_rad), 0.9 * math.sin(mid_rad), f'{deg}°',
            ha='center', va='center', fontsize=14, color='red', fontweight='bold')
    ax.set_xlim(-0.5, length + 0.5)
    ax.set_ylim(-0.5, length + 0.5)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_fraction(params: dict, question: str = "") -> bytes:
    num   = params.get('numerator', 3)
    denom = params.get('denominator', 4)
    fig, ax = plt.subplots(figsize=(5, 3))
    total_w = denom
    for i in range(denom):
        color = 'steelblue' if i < num else 'white'
        rect = patches.Rectangle((i, 0), 0.9, 1.5, linewidth=2,
                                  edgecolor='black', facecolor=color, alpha=0.6)
        ax.add_patch(rect)
        ax.text(i + 0.45, 0.75, str(i + 1), ha='center', va='center', fontsize=11)
    ax.text(total_w / 2, -0.4, f'{num}/{denom}', ha='center', fontsize=16, fontweight='bold', color='steelblue')
    ax.set_xlim(-0.2, total_w + 0.2)
    ax.set_ylim(-0.8, 2)
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_coordinate_plane(params: dict, question: str = "") -> bytes:
    x_min  = params.get('x_min', -5)
    x_max  = params.get('x_max', 5)
    y_min  = params.get('y_min', -5)
    y_max  = params.get('y_max', 5)
    points = params.get('points', [])

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.set_xlim(x_min - 0.5, x_max + 0.5)
    ax.set_ylim(y_min - 0.5, y_max + 0.5)
    ax.axhline(0, color='black', linewidth=1.5)
    ax.axvline(0, color='black', linewidth=1.5)
    ax.grid(True, alpha=0.3)
    ax.set_xticks(range(x_min, x_max + 1))
    ax.set_yticks(range(y_min, y_max + 1))
    ax.set_xlabel('X', fontsize=12)
    ax.set_ylabel('Y', fontsize=12, rotation=0)

    point_labels = list('ABCDEFGHIJ')
    for i, pt in enumerate(points):
        ax.plot(pt[0], pt[1], 'ro', markersize=8, zorder=5)
        label = point_labels[i] if i < len(point_labels) else str(i)
        ax.annotate(f'{label}({pt[0]},{pt[1]})', xy=(pt[0], pt[1]),
                    xytext=(8, 8), textcoords='offset points', fontsize=10, color='red')
    return _fig_to_bytes(fig)


def _draw_bar_chart(params: dict, question: str = "") -> bytes:
    labels = params.get('labels', [])
    values = params.get('values', [])
    title  = params.get('title', 'Diagram Batang')
    fig, ax = plt.subplots(figsize=(7, 5))
    bars = ax.bar(labels, values, color='steelblue', alpha=0.7, edgecolor='black')
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(values) * 0.01,
                str(val), ha='center', va='bottom', fontsize=11, fontweight='bold')
    ax.set_title(title, fontsize=13, fontweight='bold')
    ax.set_ylabel('Nilai', fontsize=11)
    ax.set_ylim(0, max(values) * 1.2 if values else 10)
    ax.grid(axis='y', alpha=0.3)
    return _fig_to_bytes(fig)


def _draw_trapezoid(params: dict, question: str = "") -> bytes:
    top    = params.get('top', 4)
    bottom = params.get('bottom', 8)
    height = params.get('height', 3)
    offset = (bottom - top) / 2
    xs = [0, bottom, bottom - offset, offset, 0]
    ys = [0, 0, height, height, 0]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.fill(xs, ys, alpha=0.2, color='steelblue')
    ax.plot(xs, ys, 'b-', linewidth=2)
    ax.text(bottom / 2, -0.3, f'{bottom} cm', ha='center', fontsize=12, fontweight='bold')
    ax.text(bottom / 2, height + 0.2, f'{top} cm', ha='center', fontsize=12, fontweight='bold')
    ax.annotate('', xy=(bottom + 0.4, height), xytext=(bottom + 0.4, 0),
                arrowprops=dict(arrowstyle='<->', color='red', lw=1.5))
    ax.text(bottom + 0.6, height / 2, f'{height} cm', va='center', fontsize=11, color='red')
    ax.set_xlim(-1, bottom + 2)
    ax.set_ylim(-0.8, height + 1)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_clock(params: dict, question: str = "") -> bytes:
    time_str = params.get('time', '07:30')
    try:
        h, m = map(int, time_str.split(':'))
    except Exception:
        h, m = 7, 30

    fig, ax = plt.subplots(figsize=(5, 5))
    circle = plt.Circle((0, 0), 1, color='white', ec='black', lw=3)
    ax.add_patch(circle)
    for i in range(1, 13):
        angle = math.radians(90 - i * 30)
        ax.text(0.85 * math.cos(angle), 0.85 * math.sin(angle), str(i),
                ha='center', va='center', fontsize=13, fontweight='bold')
    for i in range(60):
        angle = math.radians(90 - i * 6)
        r1 = 0.92 if i % 5 == 0 else 0.95
        ax.plot([r1 * math.cos(angle), math.cos(angle)],
                [r1 * math.sin(angle), math.sin(angle)], 'k-',
                lw=2 if i % 5 == 0 else 0.8)

    hour_angle   = math.radians(90 - (h % 12 + m / 60) * 30)
    minute_angle = math.radians(90 - m * 6)
    ax.annotate('', xy=(0.55 * math.cos(hour_angle), 0.55 * math.sin(hour_angle)), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='black', lw=5))
    ax.annotate('', xy=(0.8 * math.cos(minute_angle), 0.8 * math.sin(minute_angle)), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='black', lw=3))
    ax.plot(0, 0, 'ko', markersize=8)
    ax.text(0, -1.2, time_str, ha='center', fontsize=14, fontweight='bold')
    ax.set_xlim(-1.4, 1.4)
    ax.set_ylim(-1.5, 1.4)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_venn_diagram(params: dict, question: str = "") -> bytes:
    set_a        = params.get('set_a', [])
    set_b        = params.get('set_b', [])
    intersection = params.get('intersection', [])
    label_a      = params.get('label_a', 'A')
    label_b      = params.get('label_b', 'B')
    universal    = params.get('universal', [])

    only_a = [x for x in set_a if x not in intersection]
    only_b = [x for x in set_b if x not in intersection]
    outside = [x for x in universal if x not in set_a and x not in set_b]

    fig, ax = plt.subplots(figsize=(7, 5))
    rect = patches.FancyBboxPatch((-3.5, -2), 7, 4, boxstyle="round,pad=0.1",
                                   linewidth=2, edgecolor='black', facecolor='lightyellow')
    ax.add_patch(rect)
    ca = plt.Circle((-0.9, 0), 1.5, alpha=0.3, color='steelblue', lw=2, fill=True)
    cb = plt.Circle((0.9, 0), 1.5, alpha=0.3, color='salmon', lw=2, fill=True)
    ax.add_patch(ca)
    ax.add_patch(cb)
    plt.Circle((-0.9, 0), 1.5, fill=False, color='steelblue', lw=2)
    plt.Circle((0.9, 0), 1.5, fill=False, color='salmon', lw=2)

    ax.text(-0.9, 1.7, label_a, ha='center', fontsize=14, fontweight='bold', color='steelblue')
    ax.text(0.9, 1.7, label_b, ha='center', fontsize=14, fontweight='bold', color='salmon')
    ax.text(-3.2, 1.7, 'S', ha='center', fontsize=13, fontweight='bold')
    ax.text(-1.8, 0, '\n'.join(str(x) for x in only_a), ha='center', va='center', fontsize=11)
    ax.text(0, 0, '\n'.join(str(x) for x in intersection), ha='center', va='center', fontsize=11, fontweight='bold')
    ax.text(1.8, 0, '\n'.join(str(x) for x in only_b), ha='center', va='center', fontsize=11)
    if outside:
        ax.text(-2.8, -1.5, ' '.join(str(x) for x in outside), ha='center', fontsize=10)
    ax.set_xlim(-3.6, 3.6)
    ax.set_ylim(-2.2, 2.2)
    ax.set_aspect('equal')
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_pie_chart(params: dict, question: str = "") -> bytes:
    labels = params.get('labels', [])
    values = params.get('values', [])
    title  = params.get('title', 'Diagram Lingkaran')
    fig, ax = plt.subplots(figsize=(6, 6))
    colors = plt.cm.Set3.colors[:len(labels)]
    wedges, texts, autotexts = ax.pie(values, labels=labels, autopct='%1.1f%%',
                                       colors=colors, startangle=90,
                                       textprops={'fontsize': 11})
    for at in autotexts:
        at.set_fontweight('bold')
    ax.set_title(title, fontsize=13, fontweight='bold')
    return _fig_to_bytes(fig)


def _draw_factor_tree(params: dict, question: str = "") -> bytes:
    number = params.get('number', 36)

    def prime_factors(n):
        factors = []
        d = 2
        while d * d <= n:
            while n % d == 0:
                factors.append(d)
                n //= d
            d += 1
        if n > 1:
            factors.append(n)
        return factors

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.axis('off')

    def draw_node(n, x, y, level=0):
        ax.text(x, y, str(n), ha='center', va='center', fontsize=14,
                bbox=dict(boxstyle='circle,pad=0.3',
                          facecolor='lightyellow' if _is_prime(n) else 'lightblue',
                          edgecolor='black'))
        if _is_prime(n) or n == 1:
            return
        d = 2
        while n % d != 0:
            d += 1
        q = n // d
        dx = max(0.8 / (level + 1), 0.4)
        ax.plot([x, x - dx], [y - 0.15, y - 0.6], 'k-', lw=1.5)
        ax.plot([x, x + dx], [y - 0.15, y - 0.6], 'k-', lw=1.5)
        draw_node(d, x - dx, y - 0.75, level + 1)
        draw_node(q, x + dx, y - 0.75, level + 1)

    def _is_prime(n):
        if n < 2:
            return False
        for i in range(2, int(n**0.5) + 1):
            if n % i == 0:
                return False
        return True

    draw_node(number, 0.5, 0.9)
    ax.set_xlim(-0.5, 1.5)
    ax.set_ylim(-0.2, 1.1)
    ax.set_title(f'Pohon Faktor dari {number}', fontsize=12, fontweight='bold')
    return _fig_to_bytes(fig)


def _draw_matrix(params: dict, question: str = "") -> bytes:
    rows  = params.get('rows', [[1, 2], [3, 4]])
    label = params.get('label', 'A')
    nrows = len(rows)
    ncols = len(rows[0]) if rows else 0
    fig, ax = plt.subplots(figsize=(max(3, ncols * 1.2 + 1.5), max(3, nrows * 1.0 + 1.5)))
    ax.axis('off')
    cell_w, cell_h = 1.0, 0.8
    total_w = ncols * cell_w
    total_h = nrows * cell_h
    # bracket lines
    bx = -0.2
    ax.plot([bx, bx - 0.1, bx - 0.1, bx], [0, 0, total_h, total_h], 'k-', lw=2)
    rx = total_w + 0.2
    ax.plot([rx, rx + 0.1, rx + 0.1, rx], [0, 0, total_h, total_h], 'k-', lw=2)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            ax.text(c * cell_w + cell_w / 2, total_h - r * cell_h - cell_h / 2,
                    str(val), ha='center', va='center', fontsize=16, fontweight='bold')
    ax.text(-0.5, total_h / 2, f'{label} =', ha='right', va='center', fontsize=14, fontweight='bold')
    ax.set_xlim(-1.2, total_w + 1)
    ax.set_ylim(-0.5, total_h + 0.5)
    return _fig_to_bytes(fig)


def _draw_ruler(params: dict, question: str = "") -> bytes:
    length = params.get('length', 15)
    unit   = params.get('unit', 'cm')
    marked = params.get('marked_points', [])
    fig, ax = plt.subplots(figsize=(9, 2.5))
    ruler = patches.Rectangle((0, 0.3), length, 0.8, linewidth=2,
                                edgecolor='black', facecolor='lightyellow')
    ax.add_patch(ruler)
    for i in range(length * 10 + 1):
        x = i / 10
        if i % 10 == 0:
            ax.plot([x, x], [0.3, 0.0], 'k-', lw=1.5)
            ax.text(x, -0.15, str(i // 10), ha='center', fontsize=10)
        elif i % 5 == 0:
            ax.plot([x, x], [0.3, 0.15], 'k-', lw=1)
        else:
            ax.plot([x, x], [0.3, 0.22], 'k-', lw=0.5)
    ax.text(length / 2, -0.45, unit, ha='center', fontsize=10)
    for m in marked:
        ax.plot([m, m], [0.3, 1.3], 'r-', lw=2)
        ax.text(m, 1.4, f'{m} {unit}', ha='center', fontsize=11, color='red', fontweight='bold')
    ax.set_xlim(-0.5, length + 0.5)
    ax.set_ylim(-0.6, 1.7)
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_number_grid(params: dict, question: str = "") -> bytes:
    nrows = params.get('rows', 3)
    ncols = params.get('cols', 4)
    fig, ax = plt.subplots(figsize=(ncols * 0.9 + 1, nrows * 0.9 + 1))
    colors = plt.cm.Set2.colors
    for r in range(nrows):
        for c in range(ncols):
            circle = plt.Circle((c + 0.5, nrows - r - 0.5), 0.35,
                                 color=colors[r % len(colors)], alpha=0.7, lw=1.5)
            ax.add_patch(circle)
    ax.set_xlim(0, ncols)
    ax.set_ylim(0, nrows)
    ax.set_xticks(range(ncols + 1))
    ax.set_yticks(range(nrows + 1))
    ax.grid(True, lw=0.5, alpha=0.3)
    ax.set_title(f'{nrows} × {ncols} = {nrows * ncols}', fontsize=14, fontweight='bold')
    return _fig_to_bytes(fig)


def _draw_function_graph(params: dict, question: str = "") -> bytes:
    func_str = params.get('function', 'sin(x)')
    x_min    = params.get('x_min', -360)
    x_max    = params.get('x_max', 360)
    y_min    = params.get('y_min', -2)
    y_max    = params.get('y_max', 2)

    fig, ax = plt.subplots(figsize=(8, 5))
    x = np.linspace(x_min, x_max, 1000)
    try:
        safe = {'sin': np.sin, 'cos': np.cos, 'tan': np.tan,
                'sqrt': np.sqrt, 'abs': np.abs, 'pi': np.pi, 'x': x}
        y = eval(func_str.replace('^', '**'), {"__builtins__": {}}, safe)
        y = np.clip(y, y_min - 1, y_max + 1)
        ax.plot(x, y, 'steelblue', lw=2.5, label=f'y = {func_str}')
    except Exception as e:
        print(f"[image_service] function_graph eval failed: {e}")
        ax.text(0.5, 0.5, f'y = {func_str}', ha='center', transform=ax.transAxes, fontsize=14)

    ax.axhline(0, color='black', lw=1)
    ax.axvline(0, color='black', lw=1)
    ax.set_xlim(x_min, x_max)
    ax.set_ylim(y_min, y_max)
    ax.grid(True, alpha=0.3)
    ax.legend(fontsize=12)
    ax.set_xlabel('x', fontsize=12)
    ax.set_ylabel('y', fontsize=12)
    return _fig_to_bytes(fig)


def _draw_scale(params: dict, question: str = "") -> bytes:
    left  = params.get('left', '')
    right = params.get('right', '?')
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot([3.5, 3.5], [1, 3], 'k-', lw=4)
    ax.plot([3.5, 3.5], [3, 3], 'k^', markersize=14)
    ax.plot([1, 6], [3, 3], 'k-', lw=3)
    ax.plot([1, 1], [3, 2], 'k-', lw=2)
    ax.plot([6, 6], [3, 2], 'k-', lw=2)
    plate_l = patches.Ellipse((1, 2), 2, 0.3, color='saddlebrown', alpha=0.7)
    plate_r = patches.Ellipse((6, 2), 2, 0.3, color='saddlebrown', alpha=0.7)
    ax.add_patch(plate_l)
    ax.add_patch(plate_r)
    ax.text(1, 1.5, str(left), ha='center', fontsize=13, fontweight='bold')
    ax.text(6, 1.5, str(right), ha='center', fontsize=13, fontweight='bold')
    ax.text(1, 3.3, 'Kiri', ha='center', fontsize=10, color='gray')
    ax.text(6, 3.3, 'Kanan', ha='center', fontsize=10, color='gray')
    ax.set_xlim(-0.5, 8)
    ax.set_ylim(0.5, 4.5)
    ax.axis('off')
    return _fig_to_bytes(fig)


def _draw_3d_shape(params: dict, question: str = "") -> bytes:
    shape = params.get('shape', 'kubus').lower()
    given = params.get('given_info', '')
    fig = plt.figure(figsize=(5, 5))
    ax = fig.add_subplot(111, projection='3d')

    if shape == 'kubus':
        s = 1
        r = [0, s]
        for x in r:
            for y in r:
                ax.plot([x, x], [y, y], r, 'b-', lw=2)
        for x in r:
            for z in r:
                ax.plot([x, x], r, [z, z], 'b-', lw=2)
        for y in r:
            for z in r:
                ax.plot(r, [y, y], [z, z], 'b-', lw=2)
    elif shape in ('balok', 'kotak'):
        for x in [0, 2]:
            for y in [0, 1]:
                ax.plot([x, x], [y, y], [0, 1.5], 'b-', lw=2)
        for x in [0, 2]:
            for z in [0, 1.5]:
                ax.plot([x, x], [0, 1], [z, z], 'b-', lw=2)
        for y in [0, 1]:
            for z in [0, 1.5]:
                ax.plot([0, 2], [y, y], [z, z], 'b-', lw=2)
    else:
        u = np.linspace(0, 2 * np.pi, 30)
        v = np.linspace(0, np.pi, 30)
        ax.plot_surface(np.outer(np.cos(u), np.sin(v)),
                        np.outer(np.sin(u), np.sin(v)),
                        np.outer(np.ones(30), np.cos(v)),
                        alpha=0.3, color='steelblue')

    ax.set_title(f'{shape.capitalize()}\n{given}', fontsize=11)
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    return _fig_to_bytes(fig)


def _draw_tree_diagram(params: dict, question: str = "") -> bytes:
    branches = params.get('branches', ['A', 'B'])
    title    = params.get('title', 'Diagram Pohon')
    fig, ax  = plt.subplots(figsize=(7, 5))
    ax.axis('off')
    ax.set_title(title, fontsize=13, fontweight='bold')
    ax.text(0.05, 0.5, 'Mulai', ha='center', va='center', fontsize=12,
            bbox=dict(boxstyle='round', facecolor='lightyellow', edgecolor='black'),
            transform=ax.transAxes)
    n = len(branches)
    for i, b in enumerate(branches):
        y = (i + 1) / (n + 1)
        ax.annotate('', xy=(0.45, y), xytext=(0.12, 0.5),
                    xycoords='axes fraction', textcoords='axes fraction',
                    arrowprops=dict(arrowstyle='->', color='black', lw=1.5))
        ax.text(0.5, y, str(b), ha='center', va='center', fontsize=12,
                bbox=dict(boxstyle='round', facecolor='lightblue', edgecolor='black'),
                transform=ax.transAxes)
        for j, b2 in enumerate(branches):
            y2 = (i * n + j + 1) / (n * n + 1)
            ax.annotate('', xy=(0.82, y2), xytext=(0.57, y),
                        xycoords='axes fraction', textcoords='axes fraction',
                        arrowprops=dict(arrowstyle='->', color='black', lw=1))
            ax.text(0.87, y2, f'{b},{b2}', ha='center', va='center', fontsize=10,
                    bbox=dict(boxstyle='round', facecolor='lightgreen', edgecolor='black', alpha=0.7),
                    transform=ax.transAxes)
    return _fig_to_bytes(fig)


def _draw_money(params: dict, question: str = "") -> bytes:
    denoms  = params.get('denominations', [])
    amounts = params.get('amounts', [])
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.axis('off')
    x, y = 0.5, 3
    colors = ['#f0c040', '#d4e8a0', '#a0c8e8', '#f0a0a0', '#c0a0e0']
    for i, (d, amt) in enumerate(zip(denoms, amounts)):
        color = colors[i % len(colors)]
        for j in range(int(amt)):
            rect = patches.FancyBboxPatch((x + j * 0.15, y - i * 1.1), 1.8, 0.9,
                                           boxstyle="round,pad=0.05",
                                           facecolor=color, edgecolor='black', lw=1.5)
            ax.add_patch(rect)
            ax.text(x + j * 0.15 + 0.9, y - i * 1.1 + 0.45, str(d),
                    ha='center', va='center', fontsize=10, fontweight='bold')
    ax.set_xlim(0, 8)
    ax.set_ylim(-0.5, y + 1.2)
    return _fig_to_bytes(fig)


# ─── OpenRouter vision verifier ───────────────────────────────────

def _verify_image(image_bytes: bytes, image_type: str, params: dict, question: str) -> tuple[bool, str]:
    """Send image to Claude Haiku vision. Returns (is_valid, feedback)."""
    try:
        b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        verify_prompt = f"""You are a math teacher checking a diagram.

Question (Bahasa Indonesia): {question}
Diagram type: {image_type}
Parameters: {params}

Check this image:
1. Does the diagram type match what was requested?
2. Are the values/dimensions shown correctly per the parameters?
3. Is it readable and clear?

Reply ONLY with "VALID" or "INVALID: [brief reason]"."""

        msg = _claude.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=80,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
                    {"type": "text", "text": verify_prompt},
                ],
            }]
        )
        result = msg.content[0].text.strip()
        print(f"[image_service] vision verification: {result}")
        if result.upper().startswith("VALID"):
            return True, ""
        feedback = result[result.find(":") + 1:].strip() if ":" in result else result
        return False, feedback
    except Exception as e:
        print(f"[image_service] vision verification failed: {e} — accepting image")
        return True, ""  # fail open


# ─── Dispatch table ───────────────────────────────────────────────

_DRAW = {
    'number_line':      _draw_number_line,
    'rectangle':        _draw_rectangle,
    'square':           _draw_square,
    'triangle':         _draw_triangle,
    'circle':           _draw_circle,
    'angle':            _draw_angle,
    'fraction':         _draw_fraction,
    'coordinate_plane': _draw_coordinate_plane,
    'bar_chart':        _draw_bar_chart,
    '3d_shape':         _draw_3d_shape,
    'trapezoid':        _draw_trapezoid,
    'function_graph':   _draw_function_graph,
    'clock':            _draw_clock,
    'scale':            _draw_scale,
    'venn_diagram':     _draw_venn_diagram,
    'pie_chart':        _draw_pie_chart,
    'factor_tree':      _draw_factor_tree,
    'matrix':           _draw_matrix,
    'ruler':            _draw_ruler,
    'money':            _draw_money,
    'tree_diagram':     _draw_tree_diagram,
    'number_grid':      _draw_number_grid,
}


# ─── S3 delete helper ─────────────────────────────────────────────

def delete_from_s3(image_url: str) -> bool:
    if not image_url:
        return False
    try:
        base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
        key = image_url[len(base):].lstrip('/') if image_url.startswith(base) else image_url.split(BUCKET)[-1].lstrip('/')
        _get_s3().delete_object(Bucket=BUCKET, Key=key)
        print(f"[image_service] Deleted S3 object: {key}")
        return True
    except Exception as e:
        print(f"[image_service] S3 delete failed for {image_url}: {e}")
        return False


# ─── Public entry point ───────────────────────────────────────────

def generate(image_type: str, params: dict, topic: str = "general", question: str = "") -> str | None:
    """Draw with matplotlib → verify with OpenRouter vision → upload to S3."""
    draw_fn = _DRAW.get(image_type)
    if draw_fn is None:
        print(f"[image_service] unsupported image type: '{image_type}'")
        return None

    for attempt in range(1, MAX_IMAGE_RETRIES + 2):
        try:
            print(f"[image_service] draw attempt {attempt} | type={image_type}")
            image_bytes = draw_fn(params, question)
            if not image_bytes:
                return None

            is_valid, feedback = _verify_image(image_bytes, image_type, params, question)
            if is_valid:
                return _upload(image_bytes, topic)

            if attempt <= MAX_IMAGE_RETRIES:
                print(f"[image_service] attempt {attempt} invalid — feedback: {feedback}")
                # matplotlib is deterministic so adjust params slightly and retry
                params = dict(params, _feedback=feedback)
            else:
                print(f"[image_service] all attempts failed — uploading best effort")
                return _upload(image_bytes, topic)  # upload anyway, better than nothing

        except Exception as e:
            print(f"[image_service] attempt {attempt} error: {e}")
            return None

    return None
