"""
Generates math diagram images with matplotlib and uploads them to Amazon S3.
Supported types: number_line, rectangle, square, triangle, circle, angle, fraction
"""
import io, os, uuid
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import boto3

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

BUCKET   = os.getenv('S3_BUCKET_NAME')
CDN_BASE = os.getenv('S3_CDN_BASE', '')


def _upload(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    plt.close(fig)
    key = f"questions/{uuid.uuid4()}.png"
    _get_s3().upload_fileobj(
        buf, BUCKET, key,
        ExtraArgs={'ContentType': 'image/png', 'ACL': 'public-read'},
    )
    base = CDN_BASE.rstrip('/') or f"https://{BUCKET}.s3.amazonaws.com"
    return f"{base}/{key}"


def _number_line(start: int, end: int, marked: list | None = None) -> str:
    fig, ax = plt.subplots(figsize=(8, 2))
    ax.set_xlim(start - 1, end + 1)
    ax.set_ylim(-0.6, 0.6)
    ax.axhline(0, color='black', linewidth=2)
    for i in range(start, end + 1):
        ax.plot(i, 0, 'k|', markersize=12, markeredgewidth=2)
        ax.text(i, -0.3, str(i), ha='center', fontsize=11)
    if marked:
        for m in marked:
            ax.plot(m, 0, 'ro', markersize=14, zorder=5)
    ax.axis('off')
    return _upload(fig)


def _shape(shape_type: str, **p) -> str:
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.set_aspect('equal')
    BLUE, FILL = '#1565C0', '#BBDEFB'

    if shape_type == 'rectangle':
        w, h = p.get('width', 4), p.get('height', 3)
        ax.add_patch(patches.Rectangle((0.5, 1), w, h, linewidth=2,
                                        edgecolor=BLUE, facecolor=FILL, alpha=0.7))
        ax.text(0.5 + w / 2, 0.6, f"{w} cm", ha='center', fontsize=13, color=BLUE)
        ax.text(0.15, 1 + h / 2, f"{h} cm", ha='center', va='center',
                rotation=90, fontsize=13, color=BLUE)
        ax.set_xlim(0, w + 1); ax.set_ylim(0, h + 2)

    elif shape_type == 'square':
        s = p.get('side', 4)
        ax.add_patch(patches.Rectangle((0.5, 0.5), s, s, linewidth=2,
                                        edgecolor=BLUE, facecolor=FILL, alpha=0.7))
        ax.text(0.5 + s / 2, 0.1, f"{s} cm", ha='center', fontsize=13, color=BLUE)
        ax.set_xlim(0, s + 1); ax.set_ylim(0, s + 1)

    elif shape_type == 'triangle':
        pts = p.get('points', [[0.5, 0.5], [4.5, 0.5], [2.5, 4.0]])
        ax.add_patch(plt.Polygon(pts, linewidth=2, edgecolor=BLUE,
                                  facecolor=FILL, alpha=0.7))
        ax.set_xlim(0, 5); ax.set_ylim(0, 5)

    elif shape_type == 'circle':
        r = p.get('radius', 2)
        ax.add_patch(patches.Circle((2.5, 2.5), r, linewidth=2,
                                     edgecolor=BLUE, facecolor=FILL, alpha=0.7))
        ax.plot([2.5, 2.5 + r], [2.5, 2.5], color='#E53935', linewidth=2)
        ax.text(2.5 + r / 2, 2.7, f"r = {r} cm", ha='center',
                fontsize=12, color='#E53935')
        ax.set_xlim(0, 5); ax.set_ylim(0, 5)

    ax.axis('off')
    return _upload(fig)


def _angle(degrees: int) -> str:
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.set_aspect('equal')
    length = 3
    ax.annotate('', xy=(length, 0), xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='#1565C0', lw=2))
    rad = np.radians(degrees)
    ax.annotate('', xy=(length * np.cos(rad), length * np.sin(rad)),
                xytext=(0, 0),
                arrowprops=dict(arrowstyle='->', color='#1565C0', lw=2))
    ax.add_patch(patches.Arc((0, 0), 1.2, 1.2, angle=0,
                              theta1=0, theta2=degrees,
                              color='#E53935', lw=2))
    mid = np.radians(degrees / 2)
    ax.text(0.9 * np.cos(mid), 0.9 * np.sin(mid), f"{degrees}°",
            fontsize=14, color='#E53935', ha='center')
    ax.set_xlim(-0.5, length + 0.5)
    ax.set_ylim(-0.5, length + 0.5)
    ax.axis('off')
    return _upload(fig)


def _fraction(numerator: int, denominator: int) -> str:
    fig, ax = plt.subplots(figsize=(6, 2))
    w = 1 / denominator
    for i in range(denominator):
        color = '#1565C0' if i < numerator else '#E3F2FD'
        ax.add_patch(patches.Rectangle((i * w + 0.002, 0.2), w - 0.004, 0.6,
                                        linewidth=1.5, edgecolor='#1565C0',
                                        facecolor=color, alpha=0.85))
    ax.text(0.5, -0.05, f"{numerator}/{denominator}",
            ha='center', fontsize=16, fontweight='bold', color='#1565C0')
    ax.set_xlim(0, 1); ax.set_ylim(-0.2, 1)
    ax.axis('off')
    return _upload(fig)


_GENERATORS = {
    'number_line': lambda p: _number_line(**p),
    'rectangle':   lambda p: _shape('rectangle', **p),
    'square':      lambda p: _shape('square', **p),
    'triangle':    lambda p: _shape('triangle', **p),
    'circle':      lambda p: _shape('circle', **p),
    'angle':       lambda p: _angle(**p),
    'fraction':    lambda p: _fraction(**p),
}


def generate(image_type: str, params: dict) -> str | None:
    """Generate a math diagram image and upload to S3. Returns the public URL or None on failure."""
    gen = _GENERATORS.get(image_type)
    if gen is None:
        return None
    try:
        return gen(params)
    except Exception as e:
        print(f"[image_service] Failed to generate '{image_type}': {e}")
        return None
