# -*- coding: utf-8 -*-
"""Генерирует app_icon.ico — фиолетовый градиент + бары-эквалайзер.

Мотив читается и как аудио (подкаст), и как столбчатая аналитика (дашборд).
Запуск: python make_icon.py  ->  app_icon.ico
"""
import os

from PIL import Image, ImageDraw

SIZE = 256
C1 = (124, 58, 237)   # #7C3AED (акцент)
C2 = (167, 139, 250)  # #A78BFA (светлый)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def make():
    # Диагональный градиент
    bg = Image.new("RGB", (SIZE, SIZE))
    px = bg.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = (x + y) / (2 * (SIZE - 1))
            px[x, y] = lerp(C1, C2, t)

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img.paste(bg, (0, 0), rounded_mask(SIZE, 56))

    draw = ImageDraw.Draw(img)

    # Бары-эквалайзер (высоты как уровни звука / столбцы аналитики)
    heights = [0.42, 0.72, 0.55, 0.92, 0.60]
    n = len(heights)
    pad = 44          # поля слева/справа
    gap = 14          # зазор между барами
    bottom = SIZE - 52
    avail = SIZE - 2 * pad - gap * (n - 1)
    bw = avail / n
    whites = [(255, 255, 255, 235), (255, 255, 255, 200)]
    for i, h in enumerate(heights):
        x0 = pad + i * (bw + gap)
        x1 = x0 + bw
        bar_h = h * (SIZE * 0.62)
        y0 = bottom - bar_h
        col = whites[i % 2]
        draw.rounded_rectangle([x0, y0, x1, bottom], radius=int(bw / 2), fill=col)
        # «Кружок-микрофон» на самом высоком баре
        if h == max(heights):
            cx = (x0 + x1) / 2
            r = bw * 0.62
            draw.ellipse([cx - r, y0 - r * 1.5, cx + r, y0 + r * 0.5], fill=(255, 255, 255, 255))

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_icon.ico")
    img.save(out, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    # Заодно PNG для предпросмотра
    img.save(os.path.join(os.path.dirname(out), "app_icon.png"))
    print("Иконка сохранена:", out)


if __name__ == "__main__":
    make()
