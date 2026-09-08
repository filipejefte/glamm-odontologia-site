"""Gera os ícones e a imagem de compartilhamento.

Sem navegador. O símbolo é rasterizado aqui mesmo, por varredura de linha com
regra par-ímpar e três vezes de supersampling, a partir do MESMO caminho
vetorial que o site usa em SVG. Assim o ícone e a página não podem divergir:
há uma só geometria, em src/chrome.mjs e repetida abaixo.

A imagem de compartilhamento é composta com as fontes do próprio site, as
mesmas que o navegador carrega, para o card ter a tipografia da marca.

Depende de python com Pillow.

Uso:  python tools/imagens.py
"""
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(RAIZ, 'assets', 'img')
FONTES = os.path.join(RAIZ, 'assets', 'fonts')

# Cores da marca. Medidas na arte oficial, não escolhidas.
#   ardosia  #4C526A  nucleo do traco do simbolo no icone de 512 px
#   ouro     #A38434  e  #D2AF57  paradas do gradiente declarado nos SVG
CREME = (251, 248, 243)
ARDOSIA = (76, 82, 106)
ESCURO = (43, 47, 62)
OURO = (163, 132, 52)
OURO_CLARO = (210, 175, 87)
TINTA = (38, 42, 56)
TINTA_2 = (61, 67, 86)

# O contorno vem de vetorizar a arte oficial: marching squares no nivel 0.5 do
# campo de alfa, simplificado por Douglas-Peucker a 0.45 px. Conferido por
# rasterizacao contra a original: zero pixel divergindo acima de 0.5 de alfa.
SIMBOLO_D = (
    'M26.74 0.01L28.12 0.02L28.68 0.27L49.96 13.98L71.25 0.32L72.08 0.00L73.46 0.07L75.19 1.49'
    'L89.93 16.14L90.84 17.24L91.03 19.18L89.94 40.74L88.89 42.95L68.49 94.49L67.10 98.35'
    'L66.55 99.34L65.72 99.94L64.06 99.96L63.47 99.63L62.80 98.80L62.57 97.97L51.57 73.64'
    'L50.30 70.87L49.96 70.67L49.69 70.89L37.45 97.97L37.25 98.72L36.53 99.63L35.86 99.99'
    'L34.48 100.00L33.50 99.35L32.96 98.52L32.82 97.76L30.40 91.61L10.80 42.12L10.10 40.74'
    'L8.97 18.07L9.29 16.97L26.01 0.38L26.74 0.01Z'
    'M69.87 31.88L52.62 65.35L52.98 66.45L64.62 91.93L65.06 91.61L65.84 89.67L84.98 41.02'
    'L84.80 40.73L70.42 31.82L69.87 31.88Z'
    'M29.23 32.01L15.24 40.74L15.03 41.29L35.04 91.84L35.31 91.97L35.66 91.61L46.68 67.28'
    'L47.24 65.62L29.95 32.45L29.51 31.97L29.23 32.01Z'
    'M49.41 19.44L33.65 29.26L33.38 29.68L49.68 60.92L49.96 60.96L66.25 29.41L50.42 19.45'
    'L49.96 19.26L49.41 19.44Z'
    'M72.08 4.94L63.39 10.61L63.61 11.44L70.09 25.54L70.97 27.10L85.63 36.16L85.87 35.77'
    'L86.68 19.45L86.31 18.63L81.33 13.65L72.65 5.08L72.36 4.86L72.08 4.94Z'
    'M27.57 4.97L13.39 18.90L13.81 29.68L14.09 32.45L14.15 35.77L14.30 36.14L15.96 35.26'
    'L28.68 27.20L36.55 10.88L36.56 10.61L36.14 10.24L27.85 4.88L27.57 4.97Z'
    'M40.29 13.17L35.83 22.22L35.86 22.71L45.61 16.69L45.54 16.36L44.82 15.86L40.56 13.10'
    'L40.29 13.17Z'
    'M59.09 13.28L54.39 16.29L54.25 16.69L63.79 22.63L63.90 22.22L59.80 13.37L59.64 13.10'
    'L59.09 13.28Z'
)


def poligonos():
    saida = []
    for sub in SIMBOLO_D.split('M')[1:]:
        n = [float(v) for v in re.findall(r'-?\d+\.?\d*', sub)]
        saida.append(np.array(n).reshape(-1, 2))
    return saida


def mascara(lado, margem=0.0, supersample=3):
    """Alfa do simbolo num quadro `lado` x `lado`, com margem em fracao."""
    escala = lado * (1.0 - 2 * margem) / 100.0
    desloc = lado * margem
    arestas = []
    for p in poligonos():
        q = p * escala + desloc
        for i in range(len(q)):
            arestas.append((q[i], q[(i + 1) % len(q)]))
    E = np.array(arestas)
    ax, ay, bx, by = E[:, 0, 0], E[:, 0, 1], E[:, 1, 0], E[:, 1, 1]

    acc = np.zeros((lado, lado), np.float32)
    xs = (np.arange(lado * supersample) + 0.5) / supersample
    for sy in range(lado * supersample):
        y = (sy + 0.5) / supersample
        cruza = (ay > y) != (by > y)
        if not cruza.any():
            continue
        a1, a2, b1, b2 = ax[cruza], ay[cruza], bx[cruza], by[cruza]
        xin = np.sort(a1 + (y - a2) * (b1 - a1) / (b2 - a2))
        dentro = (np.searchsorted(xin, xs) % 2 == 1).astype(np.float32)
        acc[sy // supersample] += dentro.reshape(lado, supersample).mean(axis=1)
    return acc / supersample


def pintar(lado, fundo, frente, margem):
    a = mascara(lado, margem)[..., None]
    base = np.array(fundo, np.float32)
    tinta = np.array(frente, np.float32)
    px = base * (1 - a) + tinta * a
    return Image.fromarray(px.astype(np.uint8))


def fonte(nome, tam):
    return ImageFont.truetype(os.path.join(FONTES, nome), tam)


def gerar_icones():
    for lado in (32, 180, 192, 512):
        im = pintar(lado, ARDOSIA, CREME, 0.20)
        im.save(os.path.join(IMG, f'icone-{lado}.png'))
        print(f'  icone-{lado}.png')
    # Mascarável: a zona segura do Android é o circulo central de 80%, entao
    # o simbolo recua mais e o fundo sangra ate a borda.
    pintar(512, ARDOSIA, CREME, 0.30).save(os.path.join(IMG, 'icone-mascara.png'))
    print('  icone-mascara.png')


def gerar_og():
    """Card de compartilhamento, 1200x630.

    Fundo creme, filete de ouro, o logotipo original da clinica, a frase que
    diz o que e e onde fica, e os dois enderecos. Sem foto, sem promessa.

    A altura de cada bloco e medida, nao estimada: o texto e conferido contra
    a coluna disponivel e o script recusa a imagem se alguma linha
    transbordar. Card de compartilhamento com texto cortado e o tipo de erro
    que so aparece depois de publicado.
    """
    W, H = 1200, 630
    MARGEM = 96
    COL_DIR = 812           # onde comeca a area do simbolo
    COL = COL_DIR - MARGEM  # largura util da coluna de texto

    im = Image.new('RGB', (W, H), CREME)
    d = ImageDraw.Draw(im)

    # Moldura de filete duplo, o motivo do site.
    d.rectangle([40, 40, W - 41, H - 41], outline=OURO, width=2)
    d.rectangle([52, 52, W - 53, H - 53], outline=(228, 220, 206), width=1)

    # Simbolo primeiro, para o texto e os filetes ficarem por cima dele.
    lado = 292
    sx, sy = W - 142 - lado, (H - lado) // 2
    a = mascara(lado, 0.0)[..., None]
    regiao = np.asarray(im.crop((sx, sy, sx + lado, sy + lado))).astype(np.float32)
    misto = regiao * (1 - a) + np.array(OURO, np.float32) * a
    im.paste(Image.fromarray(misto.astype(np.uint8)), (sx, sy))

    # Logotipo oficial, na variante de fundo claro.
    marca = Image.open(os.path.join(IMG, 'marca-glamm.webp')).convert('RGBA')
    larg = 396
    marca = marca.resize((larg, round(marca.height * larg / marca.width)), Image.LANCZOS)
    im.paste(marca, (MARGEM - 6, 90), marca)

    f_titulo = fonte('spectral-600.ttf', 56)
    f_sub = fonte('karla-var.ttf', 24)
    f_peq = fonte('karla-var.ttf', 21)

    largo = []

    def escrever(x, y, texto, f, cor):
        d.text((x, y), texto, font=f, fill=cor)
        fim = d.textbbox((x, y), texto, font=f)[2]
        if fim > COL_DIR:
            largo.append(f'"{texto}" chega a {fim}px, passa da coluna em {fim - COL_DIR}px')

    # Grade vertical fixa. Cada bloco tem lugar marcado e nao empurra o
    # seguinte, entao nao existe colisao possivel por texto mais longo.
    escrever(MARGEM, 258, 'Odontologia em', f_titulo, ARDOSIA)
    escrever(MARGEM, 322, 'Marília e Garça', f_titulo, ARDOSIA)

    d.line([(MARGEM + 1, 414), (MARGEM + 75, 414)], fill=OURO, width=2)

    escrever(MARGEM, 440, 'Atendimento particular, com plano por escrito.', f_sub, TINTA_2)

    d.line([(MARGEM + 1, 506), (COL_DIR, 506)], fill=(228, 220, 206), width=1)
    escrever(MARGEM, 522, 'Marília  ·  Rua Marrei Júnior, 49, Fragata', f_peq, TINTA)
    escrever(MARGEM, 552, 'Garça  ·  Rua Voluntários de 32, 147, Williams', f_peq, TINTA)

    if largo:
        raise SystemExit('Texto transbordando a coluna do card:\n  ' + '\n  '.join(largo))

    im.save(os.path.join(IMG, 'og.png'))
    print(f'  og.png  {os.path.getsize(os.path.join(IMG, "og.png"))} bytes, coluna de {COL}px conferida')


if __name__ == '__main__':
    print('Ícones:')
    gerar_icones()
    print('Compartilhamento:')
    gerar_og()
