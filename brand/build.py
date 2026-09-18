#!/usr/bin/env python3
"""Regenerate every brand asset from source.

    python3 brand/build.py            # SVG sources + PNG/ICO rasters
    python3 brand/build.py --svg      # SVG only (no resvg needed)

SVG is the source, PNG is build output, and both are committed — the platforms
take raster only. Text in the shipped SVGs is outlined, so a render is identical
on a machine with no fonts installed.

Requires
  resvg          brew install resvg          (rasterising; ImageMagick is NOT a
                                              substitute — without rsvg-convert it
                                              silently falls back to its own renderer)
  fontTools      pip install fonttools brotli (reads the variable woff2)
  uharfbuzz      pip install uharfbuzz        (kerning; 'Einbürgerungstest' is
                                              spaced the way Archivo intends)
Only the wordmark needs the font tooling. If the outlined SVGs are already
committed, `--png-only` regenerates every raster with resvg alone.
"""
import argparse, functools, io, os, shutil, struct, subprocess, sys
from pathlib import Path

ROOT   = Path(__file__).resolve().parent.parent
BRAND  = ROOT / "brand"
ASSETS = BRAND / "assets"
LOGO   = ASSETS / "logo"
SOCIAL = ASSETS / "social"
FONT   = ROOT / "font" / "archivo-latin-var.woff2"

# ---- palette, copied from brand/PALETTE.md. Platform metadata cannot read a
# ---- token, so this copy is a fact pinned by tools/test-brand-colours.mjs.
ACCENT = "#0B6357"
PAPER  = "#EDF0EF"
CARD   = "#FFFFFF"
INK    = "#152227"
MUTED  = "#4F6167"
RULE   = "#DBE2E1"

TAGLINE  = "Understand the questions, don’t memorise them."
WORDMARK = "Einbürgerungstest"

# ---------------------------------------------------------------- the mark
# The gloss-E: a letterform whose base arm overruns into the underline that
# marks a glossed term in the app. Drawn in a 36 x 38 design box.
MW, MH = 36.0, 38.0
BARS = [  # x, y, w, h  (within the design box)
    (0.0,  0.0,   7.5, 38.0),   # spine
    (0.0,  0.0,  22.0,  7.5),   # top arm
    (0.0, 15.25, 16.0,  7.5),   # middle arm, shorter still
    (0.0, 30.5,  36.0,  7.5),   # base arm, overrunning — the gloss underline
]
# The arms are deliberately short. At 16px an E with full-width arms reads as a
# wide-footed E and the overrun disappears; shortening them is what makes the
# base read as an underline. Judged on rendered pixels, not in a viewer.
RX = 1.6

def mark(cx, cy, height, fill):
    """The mark, vertically centred on (cx, cy), at `height` tall."""
    s = height / MH
    x0, y0 = cx - (MW * s) / 2, cy - height / 2
    out = []
    for bx, by, bw, bh in BARS:
        out.append(
            f'<rect x="{x0 + bx*s:.3f}" y="{y0 + by*s:.3f}" '
            f'width="{bw*s:.3f}" height="{bh*s:.3f}" rx="{RX*s:.3f}"/>'
        )
    return f'<g fill="{fill}">' + "".join(out) + "</g>"

def svg(w, h, body, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}"{extra}>{body}</svg>\n')

# ------------------------------------------------------------ text outlines
@functools.lru_cache(maxsize=None)
def _font(weight):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    f = instancer.instantiateVariableFont(TTFont(FONT), {"wght": weight}, inplace=True)
    buf = io.BytesIO(); f.flavor = None; f.save(buf)
    return f, buf.getvalue()

def text_path(s, weight=700, size=100, tracking=0.0):
    """Outlined path data for `s`. Baseline at y=0, pen starts at x=0."""
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.pens.recordingPen import RecordingPen
    from fontTools.misc.transform import Transform
    import uharfbuzz as hb
    f, data = _font(weight)
    upem = f["head"].unitsPerEm
    hbf = hb.Font(hb.Face(data))
    buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties()
    hb.shape(hbf, buf)
    gs, order = f.getGlyphSet(), f.getGlyphOrder()
    scale, x, out = size / upem, 0.0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        t = Transform(scale, 0, 0, -scale,
                      x + pos.x_offset * scale, -pos.y_offset * scale)
        rec = RecordingPen(); gs[order[info.codepoint]].draw(rec)
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}")
        rec.replay(TransformPen(pen, t))
        if (d := pen.getCommands()):
            out.append(d)
        x += pos.x_advance * scale + tracking * size
    return " ".join(out), x

def cap_height(size=100):
    f, _ = _font(700)
    return f["OS/2"].sCapHeight * size / f["head"].unitsPerEm

# ------------------------------------------------------------------ sources
def build_svgs():
    LOGO.mkdir(parents=True, exist_ok=True)
    SOCIAL.mkdir(parents=True, exist_ok=True)

    # the mark, three treatments
    (LOGO / "mark.svg").write_text(svg(64, 64, mark(32, 32, 38, ACCENT),
        ' role="img" aria-label="Einbürgerungstest"'))
    (LOGO / "mark-mono.svg").write_text(svg(64, 64, mark(32, 32, 38, "currentColor")))
    (LOGO / "mark-inverted.svg").write_text(svg(64, 64, mark(32, 32, 38, CARD)))

    # the small mark: reversed on a filled tile. Below 48px the plain mark
    # thins out, so every small surface gets this instead.
    tile = (f'<rect width="64" height="64" rx="12" fill="{ACCENT}"/>'
            + mark(32, 32, 32, CARD))
    (LOGO / "mark-small.svg").write_text(svg(64, 64, tile))
    (LOGO / "favicon.svg").write_text(svg(64, 64, tile,
        ' role="img" aria-label="Einbürgerungstest"'))

    # maskable: Android crops to a circle of 80% diameter, so the mark sits
    # inside that circle and the ground runs to the bleed.
    # Android crops to a circle of 80% diameter = radius 25.6 in this 64 box.
    # The mark at 32 tall has a half-diagonal of 22.0, so it sits inside that
    # circle with room to spare. At the 24 it was first drawn at, it was inside
    # the safe zone but visibly marooned in the middle of it.
    (LOGO / "icon-maskable.svg").write_text(svg(64, 64,
        f'<rect width="64" height="64" fill="{ACCENT}"/>' + mark(32, 32, 32, CARD)))

    # wordmark, outlined
    size = 100
    d, adv = text_path(WORDMARK, 700, size, tracking=-0.005)
    ch = cap_height(size)
    pad = 6
    (LOGO / "wordmark.svg").write_text(svg(
        round(adv + pad * 2, 1), round(ch + pad * 2, 1),
        f'<g transform="translate({pad},{ch + pad})" fill="{INK}"><path d="{d}"/></g>',
        ' role="img" aria-label="Einbürgerungstest"'))

    # lockup: mark + wordmark, cap height matched to the mark's height
    mh   = ch * 1.34                     # the mark reads lighter than caps; nudge up
    gap  = ch * 0.42
    lw   = mh * (MW / MH) + gap + adv
    body = (mark(mh * (MW / MH) / 2, mh / 2, mh, ACCENT)
            + f'<g transform="translate({mh*(MW/MH)+gap},{mh/2 + ch/2})" fill="{INK}">'
              f'<path d="{d}"/></g>')
    (LOGO / "lockup.svg").write_text(svg(round(lw, 1), round(mh, 1), body,
        ' role="img" aria-label="Einbürgerungstest"'))

    build_social()
    build_github_card()
    build_readme_header()

def _center_text(s, weight, size, cx, y, fill, tracking=0.0):
    d, adv = text_path(s, weight, size, tracking)
    return (f'<g transform="translate({cx - adv/2:.2f},{y:.2f})" fill="{fill}">'
            f'<path d="{d}"/></g>'), adv

def build_social():
    """1200x630. Everything load-bearing inside the centre 66%: x 204-996, y 107-523."""
    W, H = 1200, 630
    cx = W / 2
    mh = 108
    parts = [f'<rect width="{W}" height="{H}" fill="{PAPER}"/>']
    # mark, centred, top of the safe box
    parts.append(mark(cx, 204, mh, ACCENT))
    # wordmark
    wm, _ = _center_text(WORDMARK, 700, 78, cx, 334, INK, tracking=-0.005)
    parts.append(wm)
    # tagline
    tg, _ = _center_text(TAGLINE, 400, 34, cx, 394, MUTED)
    parts.append(tg)
    # rule + the three facts
    parts.append(f'<rect x="{cx-140}" y="436" width="280" height="2" fill="{RULE}"/>')
    ft, _ = _center_text("460 questions · 361 terms explained · works offline",
                         500, 26, cx, 490, ACCENT)
    parts.append(ft)
    (SOCIAL / "social-card.svg").write_text(svg(W, H, "".join(parts)))

def build_github_card():
    """1280x640. GitHub's preview slot is 2:1, so it gets its own composition
    rather than a crop of the 1.91:1 card — cropping ate the footer line."""
    W, H = 1280, 640
    cx = W / 2
    parts = [f'<rect width="{W}" height="{H}" fill="{PAPER}"/>']
    parts.append(mark(cx, 206, 112, ACCENT))
    wm, _ = _center_text(WORDMARK, 700, 82, cx, 342, INK, tracking=-0.005)
    parts.append(wm)
    tg, _ = _center_text(TAGLINE, 400, 35, cx, 404, MUTED)
    parts.append(tg)
    parts.append(f'<rect x="{cx-150}" y="448" width="300" height="2" fill="{RULE}"/>')
    ft, _ = _center_text("460 questions · 361 terms explained · works offline",
                         500, 27, cx, 504, ACCENT)
    parts.append(ft)
    (SOCIAL / "github-card.svg").write_text(svg(W, H, "".join(parts)))

def build_readme_header():
    """1280x400, the same system in a wider crop."""
    W, H = 1280, 400
    cx = W / 2
    parts = [f'<rect width="{W}" height="{H}" fill="{PAPER}"/>']
    parts.append(mark(cx, 132, 88, ACCENT))
    wm, _ = _center_text(WORDMARK, 700, 66, cx, 244, INK, tracking=-0.005)
    parts.append(wm)
    tg, _ = _center_text(TAGLINE, 400, 30, cx, 300, MUTED)
    parts.append(tg)
    (ASSETS / "readme-header.svg").write_text(svg(W, H, "".join(parts)))

# ------------------------------------------------------------------ rasters
def resvg(src, dst, width, background=None):
    cmd = ["resvg", "-w", str(width), str(src), str(dst)]
    if background:
        cmd[1:1] = ["--background", background]
    subprocess.run(cmd, check=True, capture_output=True)

def flatten(path, background):
    """Strip the alpha channel in place. resvg always emits RGBA, and an
    apple-touch icon with alpha is rendered black by iOS.

    ImageMagick is used here on PNG only — never to rasterise an SVG, which is
    the failure mode the module docstring warns about."""
    if not shutil.which("magick"):
        print(f"  warn: magick not found, {path.name} keeps its alpha channel")
        return
    # -strip and the excluded chunks matter: ImageMagick stamps a tIME chunk
    # into the PNG, which made every rebuild produce a spurious git diff even
    # when the artwork was byte-identical. resvg's own output is already
    # deterministic.
    subprocess.run(["magick", str(path), "-background", background,
                    "-alpha", "remove", "-alpha", "off", "-strip",
                    "-define", "png:exclude-chunk=date,time",
                    str(path)],
                   check=True, capture_output=True)

def ico(png_paths, dst):
    """Pack PNGs into an .ico. No dependency: the ICO container takes PNG
    payloads directly, which every browser since IE11 reads."""
    imgs = [(p, p.read_bytes()) for p in png_paths]
    n = len(imgs)
    out = struct.pack("<HHH", 0, 1, n)
    offset = 6 + 16 * n
    entries, blobs = b"", b""
    for p, blob in imgs:
        w, h = struct.unpack(">II", blob[16:24])
        entries += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32,
                               len(blob), offset)
        offset += len(blob)
        blobs += blob
    dst.write_bytes(out + entries + blobs)

def build_pngs():
    if not shutil.which("resvg"):
        sys.exit("resvg not on PATH — brew install resvg. "
                 "ImageMagick is not a substitute (see the module docstring).")
    tmp = ASSETS / ".tmp"; tmp.mkdir(exist_ok=True)

    # manifest icons — the small mark, so they survive a launcher shelf
    resvg(LOGO / "mark-small.svg", LOGO / "icon-192.png", 192)
    resvg(LOGO / "mark-small.svg", LOGO / "icon-512.png", 512)
    resvg(LOGO / "icon-maskable.svg", LOGO / "icon-maskable-512.png", 512)

    # apple-touch: opaque. iOS paints transparency black and rounds it itself,
    # so this is rendered on the accent with no pre-rounding.
    flat = tmp / "apple-src.svg"
    # 118/180 = 66%. Judged against 51% (timid) and 78% (kit.md's nominal
    # ~20px padding, which put the base arm's end close enough to the edge to
    # be at risk from the squircle iOS masks over it).
    flat.write_text(svg(180, 180,
        f'<rect width="180" height="180" fill="{ACCENT}"/>' + mark(90, 90, 118, CARD)))
    resvg(flat, LOGO / "apple-touch-icon.png", 180, background=ACCENT)
    flatten(LOGO / "apple-touch-icon.png", ACCENT)

    # favicon .ico at 16/32/48
    sizes = []
    for s in (16, 32, 48):
        p = tmp / f"fav-{s}.png"
        resvg(LOGO / "favicon.svg", p, s)
        sizes.append(p)
    ico(sizes, LOGO / "favicon.ico")

    # cards — flattened, because a share image with alpha composites
    # unpredictably in clients that place it on their own background
    for src, dst, w in (
        (SOCIAL / "social-card.svg", SOCIAL / "social-card.png", 1200),
        (SOCIAL / "github-card.svg", SOCIAL / "github-card.png", 1280),
        (ASSETS / "readme-header.svg", ASSETS / "readme-header.png", 1280),
    ):
        resvg(src, dst, w, background=PAPER)
        flatten(dst, PAPER)

    shutil.rmtree(tmp, ignore_errors=True)

# ------------------------------------------------------------------ install
# The app is a flat static site served from the repository root, so the kit is
# copied into icon/ rather than built into a bundler's public dir. Keeping the
# directory name means the service worker's cache-first rule for /icon/ and
# every already-installed PWA keep working.
INSTALL = {
    "logo/favicon.svg":            "icon/favicon.svg",
    "logo/favicon.ico":            "icon/favicon.ico",
    "logo/apple-touch-icon.png":   "icon/apple-touch-icon.png",
    "logo/icon-192.png":           "icon/icon-192.png",
    "logo/icon-512.png":           "icon/icon-512.png",
    "logo/icon-maskable-512.png":  "icon/icon-maskable-512.png",
    "social/social-card.png":      "icon/social-card.png",
}

def install():
    for src, dst in INSTALL.items():
        s_, d_ = ASSETS / src, ROOT / dst
        d_.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(s_, d_)
    print(f"install ok ({len(INSTALL)} files into icon/)")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--svg", action="store_true", help="sources only")
    ap.add_argument("--png-only", action="store_true", help="rasters only")
    ap.add_argument("--no-install", action="store_true",
                    help="build but do not copy into the app's icon/ directory")
    a = ap.parse_args()
    os.chdir(ROOT)
    if not a.png_only:
        build_svgs(); print("svg   ok")
    if not a.svg:
        build_pngs(); print("png   ok")
    if not a.svg and not a.no_install:
        install()
