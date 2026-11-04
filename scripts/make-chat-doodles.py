"""The chat's wallpaper (Nora, 4 Nov): tiny household doodles, like WhatsApp's, tiled behind the messages.
Hand-drawn-ish strokes on a 300 px tile. Writes src/styles/chat-doodles.css with a light and a dark version."""
import random, urllib.parse
random.seed(7)
# Each doodle is drawn in a 32 x 32 box with round strokes.
D = {
 'basket': 'M5 13h22l-3 13H8Z M11 13l4-7 M21 13l-4-7 M12 17v5 M16 17v5 M20 17v5',
 'cup': 'M7 11h15v8a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6Z M22 13h2a3 3 0 0 1 0 6h-2 M11 4c-1 2 1 3 0 5 M16 4c-1 2 1 3 0 5',
 'heart': 'M16 26C8 20 5 16 5 12a5 5 0 0 1 11-2 5 5 0 0 1 11 2c0 4-3 8-11 14Z',
 'house': 'M5 15 16 6l11 9 M8 13v13h16V13 M14 26v-6h4v6',
 'leaf': 'M7 25C7 13 14 7 26 6c0 12-7 19-19 19Z M7 25 18 14',
 'star': 'M16 5l3 7 7 .8-5.3 4.7 1.6 7-6.3-3.7-6.3 3.7 1.6-7L6 12.8l7-.8Z',
 'check': 'M7 17l6 6L26 9',
 'egg': 'M16 5c5 0 9 8 9 13a9 9 0 0 1-18 0c0-5 4-13 9-13Z',
 'sock': 'M12 5h8v10l-5 8a4 4 0 0 1-7-4l4-6Z M12 9h8',
 'plant': 'M10 20h12l-2 7h-8Z M16 20v-7 M16 15c-4 0-6-3-6-6 4 0 6 3 6 6Z M16 13c3 0 6-2 6-6-4 0-6 3-6 6Z',
 'key': 'M11 15a5 5 0 1 1 0 .1Z M15 17l11 0 M22 17v4 M25 17v3',
 'spark': 'M16 6v6 M16 20v6 M6 16h6 M20 16h6',
 'note': 'M8 6h12l5 5v15H8Z M20 6v5h5 M11 16h10 M11 20h7',
 'broom': 'M25 5 15 15 M12 14l6 6 M13 15c-3 1-6 3-8 6 2 3 4 5 7 6 2-3 4-5 6-8',
 'cart': 'M4 7h4l3 13h13l2-9H10 M13 25a1.5 1.5 0 1 0 .1 0Z M22 25a1.5 1.5 0 1 0 .1 0Z',
 'moon': 'M21 6a10 10 0 1 0 5 15 8 8 0 0 1-5-15Z',
}
names = list(D)
T = 300
cells = 6
pieces = []
k = 0
for r in range(cells):
    for c in range(cells):
        name = names[(k * 7 + r) % len(names)]; k += 1
        x = c * T / cells + random.uniform(4, 14)
        y = r * T / cells + random.uniform(4, 14)
        rot = random.uniform(-24, 24)
        sc = random.uniform(.78, .98)
        pieces.append(f'<path transform="translate({x:.1f} {y:.1f}) rotate({rot:.0f} 16 16) scale({sc:.2f})" d="{D[name]}"/>')
def svg(color, opacity):
    body = ''.join(pieces)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{T}" height="{T}" viewBox="0 0 {T} {T}">'
            f'<g fill="none" stroke="{color}" stroke-opacity="{opacity}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>')
def uri(s):
    return 'url("data:image/svg+xml,' + urllib.parse.quote(s, safe=' /=:"<>,.-()') .replace('"', "'") + '")'
css = f"""/* Made by scripts/make-chat-doodles.py: tiny household doodles behind the chat, like WhatsApp's wallpaper (Nora, 4 Nov). */
:root {{ --chat-doodles: {uri(svg('#5A3A4A', .11))} }}
html[data-mode="dark"] {{ --chat-doodles: {uri(svg('#FFFFFF', .07))} }}
"""
open('src/styles/chat-doodles.css', 'w').write(css)
print(len(css))
