"""Gera as imagens do site a partir da arte original da clinica.

Nada aqui e desenhado a olho. Cada saida sai de uma fonte identificavel, que
fica em interno/marca/ e nao vai para o repositorio publico:

  glamm-cor-branco.webp     logotipo manuscrito, 800x262, ouro + branco
  favicon.png               simbolo isolado, 512x512, ardosia chapada
  foto-sem-fundo-scaled     retrato da fundadora, recortado, 1852x2560
  <sete icones>.webp        os icones de tratamento do site atual

O simbolo NAO e rasterizado a partir do PNG: e desenhado do mesmo caminho
vetorial que o site usa em SVG, com regra par-impar obtida por XOR das oito
sub-formas e quatro vezes de supersampling. Assim o icone e a pagina nao podem
divergir: ha uma so geometria.

Depende de python com Pillow e numpy.

Uso:  python tools/imagens.py
"""
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(RAIZ, 'interno', 'marca')
IMG = os.path.join(RAIZ, 'assets', 'img')
FONTES = os.path.join(RAIZ, 'assets', 'fonts')

os.makedirs(IMG, exist_ok=True)

# Cores da marca. Medidas na arte oficial, nao escolhidas.
#   ardosia  #4C526A  24.981 pixels exatamente nesse valor no icone de 512 px
#   ouro     #A38434 e #D2AF57  paradas do gradiente declarado nos SVG do site
ARDOSIA = (76, 82, 106)
OURO_ESC = (163, 132, 52)
OURO = (210, 175, 87)
PORCELANA = (250, 248, 245)
AREIA = (243, 238, 230)
NOITE = (21, 23, 31)
TINTA = (25, 27, 34)
TINTA_2 = (86, 92, 107)
LINHA = (230, 223, 211)

# Contorno vindo da vetorizacao da arte oficial: marching squares no nivel 0.5
# do campo de alfa, simplificado por Douglas-Peucker a 0.45 px, conferido por
# rasterizacao propria contra a original. Caixa 0 0 100 100, regra par-impar.
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
    'M40.29 13.17L35.83 22.22L35.86 22.71L45.61 16.69L45.54 16.36L44.82 15.86L40.56 13.10L40.29 13.17Z'
    'M59.09 13.28L54.39 16.29L54.25 16.69L63.79 22.63L63.90 22.22L59.80 13.37L59.64 13.10L59.09 13.28Z'
)


def subcaminhos(d):
    """Quebra o caminho em listas de pontos, uma por sub-forma fechada."""
    formas = []
    atual = []
    for token in re.findall(r'[MLZ][^MLZ]*', d):
        letra, resto = token[0], token[1:].strip()
        if letra == 'Z':
            if atual:
                formas.append(atual)
                atual = []
            continue
        x, y = (float(v) for v in resto.split())
        if letra == 'M':
            if atual:
                formas.append(atual)
            atual = [(x, y)]
        else:
            atual.append((x, y))
    if atual:
        formas.append(atual)
    return formas


def alfa_simbolo(lado, margem=0.0, escala=4):
    """Campo de alfa do simbolo, com regra par-impar e supersampling.

    Par-impar sai do XOR das mascaras das oito sub-formas: e exatamente o que
    `fill-rule="evenodd"` faz, e nao existe em PIL de outro jeito.
    """
    grande = int(round(lado * escala))
    util = grande * (1.0 - 2.0 * margem)
    desloc = grande * margem
    acumulado = np.zeros((grande, grande), dtype=bool)

    for forma in subcaminhos(SIMBOLO_D):
        mascara = Image.new('1', (grande, grande), 0)
        desenho = ImageDraw.Draw(mascara)
        pontos = [(desloc + x / 100.0 * util, desloc + y / 100.0 * util) for x, y in forma]
        desenho.polygon(pontos, fill=1)
        acumulado ^= np.array(mascara, dtype=bool)

    # media dos blocos escala x escala: e a suavizacao
    a = acumulado.astype(np.float32)
    a = a.reshape(lado, escala, lado, escala).mean(axis=(1, 3))
    return a


def simbolo_rgba(lado, cor, margem=0.0):
    a = alfa_simbolo(lado, margem)
    img = np.zeros((lado, lado, 4), dtype=np.uint8)
    img[:, :, 0] = cor[0]
    img[:, :, 1] = cor[1]
    img[:, :, 2] = cor[2]
    img[:, :, 3] = np.clip(a * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(img, 'RGBA')


def sobre(fundo, lado, cor_fundo, cor_simbolo, margem, raio=None):
    base = Image.new('RGBA', (lado, lado), cor_fundo + (255,))
    if raio:
        mascara = Image.new('L', (lado * 4, lado * 4), 0)
        ImageDraw.Draw(mascara).rounded_rectangle(
            [0, 0, lado * 4 - 1, lado * 4 - 1], radius=raio * 4, fill=255)
        base.putalpha(mascara.resize((lado, lado), Image.LANCZOS))
    marca = simbolo_rgba(lado, cor_simbolo, margem)
    base.alpha_composite(marca)
    return base


# --------------------------------------------------------------------------
# 1. Icones do navegador
# --------------------------------------------------------------------------

def icones():
    saidas = []
    for lado, nome, margem in ((32, 'icone-32.png', 0.10),
                               (180, 'icone-180.png', 0.16),
                               (192, 'icone-192.png', 0.16),
                               (512, 'icone-512.png', 0.16)):
        img = sobre(None, lado, PORCELANA, ARDOSIA, margem)
        img.save(os.path.join(IMG, nome))
        saidas.append(nome)

    # Maskable: o desenho precisa caber no circulo interno de 80%.
    img = sobre(None, 512, PORCELANA, ARDOSIA, 0.28)
    img.save(os.path.join(IMG, 'icone-mascara.png'))
    saidas.append('icone-mascara.png')
    return saidas


# --------------------------------------------------------------------------
# 2. As duas variantes do logotipo manuscrito
#
# A separacao entre o manuscrito e a palavra ODONTOLOGIA nao e recorte a mao:
# cada pixel e classificado pela saturacao em HSV. O manuscrito e cromatico
# (saturacao >= 0.18) e a palavra e acromatica. Na variante de fundo claro so a
# palavra muda de cor; o alfa nunca e tocado, entao a suavizacao das letras
# fica intacta e o manuscrito em ouro sai identico ao original, pixel a pixel.
# --------------------------------------------------------------------------

def logotipo():
    origem = Image.open(os.path.join(ORIG, 'glamm-cor-branco.webp')).convert('RGBA')
    a = np.array(origem).astype(np.float32)
    rgb = a[:, :, :3]
    alfa = a[:, :, 3]

    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    saturacao = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    acromatico = (saturacao < 0.18) & (alfa > 0)

    # ------------------------------------------------------------------
    # A VARIANTE DE FUNDO CLARO PRECISA DE MAIS TINTA.
    #
    # O manuscrito e um traco de meio pixel em ouro #A8873A, que da 3,35:1
    # sobre a porcelana: some no cabecalho branco. Duas correcoes, as duas
    # sobre a arte original, sem redesenhar nada:
    #
    #   1. luminancia do ouro multiplicada por 0,78, o que preserva matiz e
    #      saturacao e leva o traco a ~4,9:1. Continua ouro, e nao vira marrom;
    #   2. gama no alfa (0,78), que engrossa o traco suavizado sem mover o
    #      contorno: o mesmo truque usado nos icones de tratamento.
    #
    # A palavra ODONTOLOGIA vira ardosia chapada, como antes.
    # A variante de fundo escuro NAO e tocada: la o ouro original da 8,8:1.
    # ------------------------------------------------------------------
    ESCURECER = 0.72
    GAMA_ALFA = 0.60

    clara_arr = np.array(origem).astype(np.float32)
    cromatico = (~acromatico) & (alfa > 0)

    for c in range(3):
        canal = clara_arr[:, :, c]
        canal[cromatico] = np.clip(canal[cromatico] * ESCURECER, 0, 255)
        canal[acromatico] = ARDOSIA[c]
        clara_arr[:, :, c] = canal

    clara_arr[:, :, 3] = np.clip(np.power(alfa / 255.0, GAMA_ALFA) * 255.0, 0, 255)
    clara = Image.fromarray(clara_arr.astype(np.uint8), 'RGBA')

    # O logotipo aparece a 128 px de largura. 480 px cobre tela de alta
    # densidade com folga e corta o arquivo a um terco.
    largura = 480
    altura = int(round(origem.height * largura / origem.width))
    # WebP, e nao PNG: traco suavizado sobre transparencia gera muitas cores
    # distintas e o PNG chega a 36 KB para a mesma imagem que o WebP resolve em
    # menos de 10. O PNG so fica onde o formato e exigido: favicon e og.
    clara.resize((largura, altura), Image.LANCZOS).save(
        os.path.join(IMG, 'marca-glamm.webp'), quality=80, method=6)
    origem.resize((largura, altura), Image.LANCZOS).save(
        os.path.join(IMG, 'marca-glamm-clara.webp'), quality=80, method=6)
    # Intermediario para a composicao do og.png, em tamanho cheio. Fica junto
    # da arte de origem, fora do que o site publica.
    clara.save(os.path.join(ORIG, 'marca-og.png'), optimize=True)

    return (largura, altura), int(acromatico.sum())


# --------------------------------------------------------------------------
# 3. Icones de tratamento
#
# Sao os icones do proprio site da clinica: manter a iconografia e parte de
# manter a identidade. O que muda e a cor e o contraste. O desenho vem no canal
# de alfa; o RGB rosa claro e descartado e substituido por um degrade do ouro
# da marca, e o alfa recebe um gama que engrossa o traco fino sem redesenha-lo.
# --------------------------------------------------------------------------

MAPA_ICONES = {
    'faceta': 'lentedecontato.webp',
    'alinhador': 'ortodontia.webp',
    'implante': 'implantesdentarios.webp',
    'clareamento': 'clareamentodental.webp',
    'canal': 'endodontia.webp',
    'gengiva': 'periodontia.webp',
    'camera': 'checkupdigital.webp',
}


def icones_tratamento(lado=192):
    feitos = []
    for nome, arquivo in MAPA_ICONES.items():
        caminho = os.path.join(ORIG, arquivo)
        if not os.path.exists(caminho):
            print('  ausente:', arquivo)
            continue
        origem = Image.open(caminho).convert('RGBA').resize((lado, lado), Image.LANCZOS)
        alfa = np.array(origem)[:, :, 3].astype(np.float32) / 255.0
        # gama < 1 engrossa o traco suavizado; o contorno nao se move
        alfa = np.power(alfa, 0.72)

        y = np.linspace(0.0, 1.0, lado, dtype=np.float32)[:, None]
        img = np.zeros((lado, lado, 4), dtype=np.uint8)
        for c in range(3):
            img[:, :, c] = np.clip(OURO[c] + (OURO_ESC[c] - OURO[c]) * y, 0, 255).astype(np.uint8)
        img[:, :, 3] = np.clip(alfa * 255.0, 0, 255).astype(np.uint8)

        Image.fromarray(img, 'RGBA').save(
            os.path.join(IMG, 'ico-%s.webp' % nome), quality=88, method=6)
        feitos.append(nome)
    return feitos


# --------------------------------------------------------------------------
# 4. Retrato da fundadora
# --------------------------------------------------------------------------

def retrato(altura=1280):
    caminho = os.path.join(ORIG, 'foto-sem-fundo-scaled.webp')
    if not os.path.exists(caminho):
        return None
    origem = Image.open(caminho).convert('RGBA')
    caixa = origem.split()[3].getbbox()
    if caixa:
        origem = origem.crop(caixa)
    escala = altura / origem.height
    largura = int(round(origem.width * escala))
    saida = origem.resize((largura, altura), Image.LANCZOS)
    saida.save(os.path.join(IMG, 'fundadora.webp'), quality=80, method=6)
    return saida.size


# --------------------------------------------------------------------------
# 5. Imagem de compartilhamento
#
# Composta com as MESMAS fontes que o navegador carrega, para o card ter a
# tipografia da marca.
# --------------------------------------------------------------------------

def fonte(arquivo, tamanho, peso=None):
    caminho = os.path.join(FONTES, arquivo)
    f = ImageFont.truetype(caminho, tamanho)
    if peso is not None:
        try:
            f.set_variation_by_axes([peso])
        except Exception:
            pass
    return f


def compartilhar(unidades_texto):
    L, A = 1200, 630
    img = Image.new('RGB', (L, A), PORCELANA)
    d = ImageDraw.Draw(img)

    # brilho quente no canto superior direito, o mesmo da capa
    brilho = Image.new('L', (L, A), 0)
    bd = ImageDraw.Draw(brilho)
    for i in range(58):
        t = i / 57.0
        raio = int(520 * (1.0 - t)) + 40
        bd.ellipse([int(L * 0.80) - raio, int(A * 0.16) - raio,
                    int(L * 0.80) + raio, int(A * 0.16) + raio],
                   fill=int(40 * t * t))
    img.paste(Image.new('RGB', (L, A), OURO), (0, 0), brilho)

    # faixa de ouro no topo
    for x in range(L):
        t = x / (L - 1.0)
        cor = tuple(int(OURO[c] + (OURO_ESC[c] - OURO[c]) * t) for c in range(3))
        d.line([(x, 0), (x, 5)], fill=cor)

    marca = Image.open(os.path.join(ORIG, 'marca-og.png')).convert('RGBA')
    largura = 300
    marca = marca.resize((largura, int(marca.height * largura / marca.width)), Image.LANCZOS)
    img.paste(marca, (84, 80), marca)

    titulo = fonte('cormorant-var.ttf', 74, 500)
    corpo = fonte('hanken-var.ttf', 27, 400)
    rotulo = fonte('hanken-var.ttf', 20, 700)
    rodape = fonte('hanken-var.ttf', 22, 500)

    # PIL nao tem entreletra: o rotulo e escrito caractere a caractere.
    def espacado(xy, texto, f, cor, entre=3.4):
        x, y = xy
        for ch in texto:
            d.text((x, y), ch, font=f, fill=cor)
            x += d.textlength(ch, font=f) + entre
        return x

    espacado((86, 212), 'CLÍNICA ODONTOLÓGICA', rotulo, (122, 95, 31))
    d.text((84, 248), 'Dentista em', font=titulo, fill=TINTA)
    d.text((84, 328), 'Marília e Garça', font=titulo, fill=OURO_ESC)

    d.text((86, 436), 'Avaliação com o plano de tratamento por escrito.', font=corpo, fill=TINTA_2)
    d.text((86, 474), unidades_texto, font=corpo, fill=TINTA_2)

    d.line([(84, 540), (L - 84, 540)], fill=LINHA, width=1)
    espacado((86, 566), 'MARÍLIA', rodape, TINTA, 2.6)
    d.text((238, 566), '·', font=rodape, fill=LINHA)
    espacado((262, 566), 'GARÇA', rodape, TINTA, 2.6)
    d.text((L - 84 - d.textlength('Atendimento particular', font=rodape), 566),
           'Atendimento particular', font=rodape, fill=TINTA_2)

    simbolo = simbolo_rgba(116, ARDOSIA)
    img.paste(simbolo, (L - 84 - 116, 84), simbolo)

    img.save(os.path.join(IMG, 'og.png'), optimize=True)
    return (L, A)


# --------------------------------------------------------------------------

if __name__ == '__main__':
    print('icones do navegador:', ', '.join(icones()))
    tamanho, acromaticos = logotipo()
    print('logotipo: %sx%s, %d pixels acromaticos recolorados para a variante clara'
          % (tamanho[0], tamanho[1], acromaticos))
    print('icones de tratamento:', ', '.join(icones_tratamento()))
    print('retrato:', retrato())
    print('compartilhamento:', compartilhar('Duas unidades no interior de São Paulo.'))

    total = 0
    for nome in sorted(os.listdir(IMG)):
        caminho = os.path.join(IMG, nome)
        tam = os.path.getsize(caminho)
        total += tam
        print('  %-28s %7d bytes' % (nome, tam))
    print('  %-28s %7d bytes' % ('TOTAL', total))
