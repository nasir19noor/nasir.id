# question_generator.py
# Generates math quiz questions programmatically (no AI) for iTung
import random
import math
from fractions import Fraction
import statistics

try:
    import sympy
    from sympy import symbols, solve, diff, integrate, limit, log, sqrt, factor, simplify, Rational
    from sympy import sin as sp_sin, cos as sp_cos, tan as sp_tan
    SYMPY_OK = True
except ImportError:
    SYMPY_OK = False

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _rng(difficulty):
    return {
        "sangat_mudah": (1, 9),
        "mudah": (2, 20),
        "sedang": (10, 50),
        "sulit": (50, 200),
        "sangat_sulit": (100, 500),
    }.get(difficulty, (1, 20))


def _c(correct_str, wrongs_list):
    correct_str = str(correct_str)
    seen = {correct_str}
    filtered = []
    for w in wrongs_list:
        s = str(w)
        if s not in seen:
            seen.add(s)
            filtered.append(s)
    # pad if not enough
    pad_val = 1
    while len(filtered) < 3:
        s = str(pad_val)
        if s not in seen:
            seen.add(s)
            filtered.append(s)
        pad_val += 1
    options = [correct_str] + filtered[:3]
    random.shuffle(options)
    letters = ["A", "B", "C", "D"]
    choices = [f"{letters[i]}. {options[i]}" for i in range(4)]
    correct_letter = letters[options.index(correct_str)]
    return choices, correct_letter


def _fmt(n):
    if isinstance(n, float) and n == int(n):
        return str(int(n))
    if isinstance(n, float):
        return f"{n:.2f}"
    return str(n)


# ---------------------------------------------------------------------------
# DASAR
# ---------------------------------------------------------------------------

def _gen_mengenal_bilangan(difficulty, age):
    words = {
        1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima",
        6: "enam", 7: "tujuh", 8: "delapan", 9: "sembilan", 10: "sepuluh",
        11: "sebelas", 12: "dua belas", 13: "tiga belas", 14: "empat belas",
        15: "lima belas", 16: "enam belas", 17: "tujuh belas", 18: "delapan belas",
        19: "sembilan belas", 20: "dua puluh",
    }
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    lo = max(lo, 1)
    n = random.randint(lo, hi)
    word = words.get(n, str(n))
    soal = f"Berapa nilai dari: {word}?"
    wrongs = [n + random.randint(1, 5), n - random.randint(1, 3) if n > 3 else n + 6, n + random.randint(6, 10)]
    choices, letter = _c(str(n), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_penjumlahan_dasar(difficulty, age):
    lo, hi = _rng(difficulty)
    a = random.randint(lo, hi)
    b = random.randint(lo, hi)
    ans = a + b
    soal = f"Berapa hasil dari {a} + {b}?"
    wrongs = [ans + 1, ans - 1, ans + 2]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengurangan_dasar(difficulty, age):
    lo, hi = _rng(difficulty)
    b = random.randint(lo, hi)
    a = random.randint(b, hi)
    ans = a - b
    soal = f"Berapa hasil dari {a} - {b}?"
    wrongs = [ans + 1, ans - 1 if ans > 0 else ans + 2, ans + 3]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_penjumlahan_dan_pengurangan_dasar(difficulty, age):
    lo, hi = _rng(difficulty)
    a = random.randint(lo, hi)
    b = random.randint(lo, hi)
    c = random.randint(lo, min(a + b, hi))
    ans = a + b - c
    soal = f"Berapa hasil dari {a} + {b} - {c}?"
    wrongs = [ans + 1, ans - 1 if ans > 0 else ans + 2, ans + 3]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengenalan_perkalian(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 10)
    lo = min(lo, hi)
    lo = max(lo, 2)
    times = random.randint(lo, hi)
    val = random.randint(2, 9)
    total = val * times
    soal = f"{' + '.join([str(val)] * times)} = {val} × ?"
    wrongs = [times + 1, times - 1 if times > 1 else times + 2, times + 2]
    choices, letter = _c(str(times), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengenalan_pembagian(difficulty, age):
    lo, hi = _rng(difficulty)
    divisor = random.randint(2, 6)
    quotient = random.randint(2, max(2, hi // divisor))
    total = divisor * quotient
    soal = f"{total} bola dibagi {divisor} anak = ... bola tiap anak"
    wrongs = [quotient + 1, quotient - 1 if quotient > 1 else quotient + 2, quotient + 2]
    choices, letter = _c(str(quotient), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_perkalian(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    a = random.randint(lo, hi)
    b = random.randint(lo, hi)
    ans = a * b
    soal = f"Berapa hasil dari {a} × {b}?"
    wrongs = [ans + b, ans - a, ans + a]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pembagian(difficulty, age):
    lo, hi = _rng(difficulty)
    b = random.randint(2, max(2, hi // 3))
    q = random.randint(2, max(2, hi // b))
    a = b * q
    soal = f"Berapa hasil dari {a} ÷ {b}?"
    wrongs = [q + 1, q - 1 if q > 1 else q + 2, q + b]
    choices, letter = _c(str(q), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_perkalian_dan_pembagian(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    a = random.randint(lo, hi)
    b = random.randint(2, 9)
    c = random.randint(2, 9)
    # a × b ÷ c, ensure divisible
    prod = a * b
    prod = prod - (prod % c)
    if prod == 0:
        prod = c
    ans = prod // c
    soal = f"Berapa hasil dari {prod // b} × {b} ÷ {c}?"
    wrongs = [ans + 1, ans + c, ans - 1 if ans > 1 else ans + 2]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_operasi_hitung_campuran(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    a = random.randint(lo, hi)
    b = random.randint(lo, hi)
    c = random.randint(lo, hi)
    ans = a + b * c
    soal = f"Berapa hasil dari {a} + {b} × {c}? (gunakan aturan BODMAS)"
    wrongs = [(a + b) * c, ans + b, ans - c]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bilangan_bulat(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    a = random.randint(1, hi)
    b = random.randint(1, hi)
    neg_a = -a
    ans = neg_a + b
    soal = f"Berapa hasil dari ({neg_a}) + {b}?"
    wrongs = [ans + 1, ans - 1, -ans]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bilangan_romawi(difficulty, age):
    roman_map = {
        1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX",10:"X",
        11:"XI",12:"XII",13:"XIII",14:"XIV",15:"XV",16:"XVI",17:"XVII",18:"XVIII",
        19:"XIX",20:"XX",21:"XXI",22:"XXII",23:"XXIII",24:"XXIV",25:"XXV",
        26:"XXVI",27:"XXVII",28:"XXVIII",29:"XXIX",30:"XXX",
        31:"XXXI",32:"XXXII",33:"XXXIII",34:"XXXIV",35:"XXXV",
        36:"XXXVI",37:"XXXVII",38:"XXXVIII",39:"XXXIX",40:"XL",
        41:"XLI",42:"XLII",43:"XLIII",44:"XLIV",45:"XLV",
        46:"XLVI",47:"XLVII",48:"XLVIII",49:"XLIX",50:"L",
    }
    lo, hi = _rng(difficulty)
    hi = min(hi, 50)
    lo = min(lo, hi)
    lo = max(lo, 1)
    n = random.randint(lo, hi)
    roman = roman_map[n]
    if random.random() < 0.5:
        soal = f"Tuliskan bilangan {n} dalam angka Romawi!"
        correct = roman
        nums = list(roman_map.keys())
        wnums = random.sample([x for x in nums if x != n], 3)
        wrongs = [roman_map[w] for w in wnums]
        choices, letter = _c(correct, wrongs)
    else:
        soal = f"Bilangan Romawi {roman} sama dengan bilangan berapa?"
        correct = str(n)
        wnums = random.sample([x for x in roman_map.keys() if x != n], 3)
        wrongs = [str(w) for w in wnums]
        choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bilangan_pecahan(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 10)
    lo = min(lo, hi)
    lo = max(lo, 1)
    a_num = random.randint(1, hi)
    a_den = random.randint(2, 8)
    b_num = random.randint(1, hi)
    b_den = random.randint(2, 8)
    op = random.choice(['+', '-', '×'])
    fa = Fraction(a_num, a_den)
    fb = Fraction(b_num, b_den)
    if op == '+':
        result = fa + fb
        soal = f"Berapa hasil dari {a_num}/{a_den} + {b_num}/{b_den}?"
    elif op == '-':
        if fa < fb:
            fa, fb = fb, fa
            a_num, a_den, b_num, b_den = fa.numerator, fa.denominator, fb.numerator, fb.denominator
        result = fa - fb
        soal = f"Berapa hasil dari {a_num}/{a_den} - {b_num}/{b_den}?"
    else:
        result = fa * fb
        soal = f"Berapa hasil dari {a_num}/{a_den} × {b_num}/{b_den}?"
    correct = f"{result.numerator}/{result.denominator}"
    # generate wrong fractions
    r2 = Fraction(result.numerator + 1, result.denominator)
    r3 = Fraction(result.numerator, result.denominator + 1)
    r4 = Fraction(result.numerator + 1, result.denominator + 1)
    wrongs = [f"{r2.numerator}/{r2.denominator}", f"{r3.numerator}/{r3.denominator}", f"{r4.numerator}/{r4.denominator}"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bilangan_desimal(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    a = round(random.uniform(lo, hi), 1)
    b = round(random.uniform(lo, hi), 1)
    op = random.choice(['+', '-'])
    if op == '+':
        ans = round(a + b, 1)
        soal = f"Berapa hasil dari {a} + {b}?"
    else:
        if a < b:
            a, b = b, a
        ans = round(a - b, 1)
        soal = f"Berapa hasil dari {a} - {b}?"
    wrongs = [round(ans + 0.1, 1), round(ans - 0.1, 1), round(ans + 0.2, 1)]
    choices, letter = _c(_fmt(ans), [_fmt(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_persen(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 100)
    lo = min(lo, hi)
    pct = random.choice([10, 20, 25, 50, 75, 5, 15, 30])
    low_total = max(5, lo)
    hi_total = max(low_total, hi)
    total = random.randint(low_total, hi_total) * 4
    ans = total * pct // 100
    soal = f"Berapa {pct}% dari {total}?"
    wrongs = [ans + pct, ans - pct if ans > pct else ans + 5, ans * 2]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_kpk(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    lo = max(lo, 2)
    a = random.randint(lo, hi)
    b = random.randint(lo, hi)
    ans = math.lcm(a, b)
    soal = f"Berapa KPK (Kelipatan Persekutuan Terkecil) dari {a} dan {b}?"
    wrongs = [ans + a, ans + b, a * b]
    choices, letter = _c(str(ans), [str(w) for w in wrongs if str(w) != str(ans)])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_fpb(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    lo = max(lo, 2)
    a = random.randint(lo, hi)
    b = random.randint(lo, hi)
    ans = math.gcd(a, b)
    soal = f"Berapa FPB (Faktor Persekutuan Terbesar) dari {a} dan {b}?"
    wrongs = [ans + 1, ans + 2, ans * 2]
    choices, letter = _c(str(ans), [str(w) for w in wrongs if str(w) != str(ans)])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_faktor_dan_kelipatan(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    n = random.randint(6, hi)
    factors = [i for i in range(1, n + 1) if n % i == 0]
    correct_set = set(factors)
    soal = f"Manakah yang merupakan faktor dari {n}?"
    # pick a valid factor as correct
    correct = str(random.choice(factors))
    # non-factors as wrongs
    non_factors = [i for i in range(1, n + 1) if n % i != 0]
    wrongs = random.sample(non_factors, min(3, len(non_factors)))
    while len(wrongs) < 3:
        wrongs.append(n + random.randint(1, 5))
    choices, letter = _c(correct, [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_rasio_dan_proporsi(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    a = random.randint(1, hi)
    b = random.randint(1, hi)
    c = random.randint(1, hi) * a
    d = c // a * b
    soal = f"Jika {a} : {b} = {c} : ?, tentukan nilai yang hilang!"
    wrongs = [d + b, d - b if d > b else d + 1, d + a]
    choices, letter = _c(str(d), [str(w) for w in wrongs if str(w) != str(d)])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_nilai_uang(difficulty, age):
    prices = [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000]
    price = random.choice(prices)
    qty = random.randint(2, 5)
    total = price * qty
    bayar_choices = [total + 1000, total + 2000, total + 5000, total + 10000]
    bayar = random.choice([b for b in bayar_choices if b > total])
    kembalian = bayar - total
    soal = f"Harga satu barang Rp{price:,}. Beli {qty} barang, bayar Rp{bayar:,}. Kembaliannya?"
    wrongs = [kembalian + 500, kembalian - 500 if kembalian > 500 else kembalian + 1000, kembalian + 1000]
    choices, letter = _c(f"Rp{kembalian:,}", [f"Rp{w:,}" for w in wrongs if w > 0])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_garis_bilangan(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 10)
    lo = min(lo, hi)
    a = random.randint(-hi, hi - 2)
    b = a + random.randint(2, 4)
    mid = random.randint(a + 1, b - 1)
    soal = f"Bilangan apakah yang terletak di antara {a} dan {b} pada garis bilangan?"
    wrongs = [a - 1, b + 1, b + 2]
    choices, letter = _c(str(mid), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_koordinat_kartesius_sederhana(difficulty, age):
    quadrants = {
        1: ("positif", "positif", "I"),
        2: ("negatif", "positif", "II"),
        3: ("negatif", "negatif", "III"),
        4: ("positif", "negatif", "IV"),
    }
    q = random.randint(1, 4)
    x_sign, y_sign, q_name = quadrants[q]
    lo = 1
    hi = 5
    x = random.randint(lo, hi) * (1 if x_sign == "positif" else -1)
    y = random.randint(lo, hi) * (1 if y_sign == "positif" else -1)
    soal = f"Titik ({x}, {y}) berada di kuadran berapa?"
    all_q = ["I", "II", "III", "IV"]
    wrongs = [qq for qq in all_q if qq != q_name]
    choices, letter = _c(q_name, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_skala_dan_denah(difficulty, age):
    scales = [100, 200, 500, 1000, 2000, 5000]
    scale = random.choice(scales)
    map_cm = random.randint(2, 10)
    real_cm = map_cm * scale
    real_m = real_cm / 100
    soal = f"Skala peta 1:{scale}. Jarak pada peta {map_cm} cm. Jarak sebenarnya adalah?"
    correct = f"{_fmt(real_m)} m"
    wrongs = [f"{_fmt(real_m * 2)} m", f"{_fmt(real_m / 2)} m", f"{_fmt(real_m + scale/100)} m"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengenalan_waktu(difficulty, age):
    hour = random.randint(1, 12)
    minutes = random.choice([0, 15, 30, 45])
    if minutes == 0:
        soal = f"Pukul berapa jika jarum pendek di {hour} dan jarum panjang di 12?"
        correct = f"{hour:02d}.00"
        wrongs = [f"{(hour % 12) + 1:02d}.00", f"{(hour - 1) if hour > 1 else 12:02d}.00", f"{hour:02d}.30"]
    elif minutes == 15:
        soal = f"Pukul berapa jika jarum pendek mendekati {hour} dan jarum panjang di 3?"
        correct = f"{hour:02d}.15"
        wrongs = [f"{hour:02d}.30", f"{hour:02d}.45", f"{(hour % 12) + 1:02d}.15"]
    elif minutes == 30:
        soal = f"Pukul berapa jika jarum pendek di antara {hour} dan {(hour % 12) + 1}, jarum panjang di 6?"
        correct = f"{hour:02d}.30"
        wrongs = [f"{hour:02d}.00", f"{hour:02d}.15", f"{(hour % 12) + 1:02d}.30"]
    else:
        soal = f"Pukul berapa jika jarum panjang di 9 dan jarum pendek mendekati {(hour % 12) + 1}?"
        correct = f"{hour:02d}.45"
        wrongs = [f"{hour:02d}.30", f"{(hour % 12) + 1:02d}.00", f"{hour:02d}.15"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengukuran_waktu(difficulty, age):
    mode = random.choice(["elapsed", "convert"])
    if mode == "elapsed":
        start_h = random.randint(6, 20)
        dur_h = random.randint(1, 5)
        end_h = start_h + dur_h
        soal = f"Kegiatan dimulai pukul {start_h:02d}.00 dan berlangsung selama {dur_h} jam. Selesai pukul berapa?"
        correct = f"{end_h:02d}.00"
        wrongs = [f"{end_h + 1:02d}.00", f"{end_h - 1:02d}.00", f"{start_h:02d}.00"]
    else:
        hours = random.randint(1, 10)
        minutes = hours * 60
        soal = f"Berapa menit dalam {hours} jam?"
        correct = str(minutes)
        wrongs = [str(minutes + 60), str(minutes - 60), str(hours * 30)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengukuran_panjang(difficulty, age):
    conversions = [
        ("km", "m", 1000), ("m", "cm", 100), ("cm", "mm", 10), ("m", "mm", 1000),
    ]
    unit_from, unit_to, factor = random.choice(conversions)
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    val = random.randint(1, hi)
    ans = val * factor
    soal = f"Berapa {unit_to} dalam {val} {unit_from}?"
    correct = str(ans)
    wrongs = [str(ans + factor), str(ans * 10), str(val)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pengukuran_berat(difficulty, age):
    conversions = [
        ("ton", "kg", 1000), ("kg", "g", 1000), ("g", "mg", 1000),
    ]
    unit_from, unit_to, factor = random.choice(conversions)
    lo, hi = _rng(difficulty)
    hi = min(hi, 10)
    lo = min(lo, hi)
    val = random.randint(1, hi)
    ans = val * factor
    soal = f"Berapa {unit_to} dalam {val} {unit_from}?"
    correct = str(ans)
    wrongs = [str(ans + factor), str(ans * 2), str(val * 100)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_satuan(difficulty, age):
    unit_types = [
        ("kecepatan", "km/jam", "m/s", lambda v: round(v / 3.6, 2), lambda v: f"{v} km/jam", "m/s"),
        ("suhu Celsius", "°C", "°F", lambda v: v * 9 / 5 + 32, lambda v: f"{v}°C", "°F"),
        ("liter", "liter", "mL", lambda v: v * 1000, lambda v: f"{v} liter", "mL"),
    ]
    name, uf, ut, conv, soal_fn, ans_unit = random.choice(unit_types)
    val = random.randint(1, 10)
    ans = conv(val)
    soal = f"Berapa {ans_unit} dari {soal_fn(val)}?"
    correct = _fmt(ans)
    wrongs = [_fmt(ans + val), _fmt(ans * 2), _fmt(ans / 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_mengenal_bangun_datar(difficulty, age):
    shapes = [
        ("3 sisi", "segitiga", ["persegi", "lingkaran", "persegi panjang"]),
        ("4 sisi yang sama panjang", "persegi", ["persegi panjang", "segitiga", "trapesium"]),
        ("tidak memiliki sudut", "lingkaran", ["segitiga", "persegi", "trapesium"]),
        ("6 sisi", "segi enam", ["segi lima", "segitiga", "persegi"]),
        ("sepasang sisi sejajar", "trapesium", ["persegi", "lingkaran", "segitiga"]),
    ]
    desc, correct, wrongs = random.choice(shapes)
    soal = f"Bangun datar yang memiliki {desc} disebut?"
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_keliling_bangun_datar(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    shape = random.choice(["persegi", "persegi panjang", "segitiga"])
    if shape == "persegi":
        s = random.randint(lo, hi)
        k = 4 * s
        soal = f"Berapa keliling persegi dengan sisi {s} cm?"
        wrongs = [3 * s, 2 * s, k + s]
    elif shape == "persegi panjang":
        p = random.randint(lo, hi)
        l = random.randint(lo, hi)
        k = 2 * (p + l)
        soal = f"Berapa keliling persegi panjang dengan panjang {p} cm dan lebar {l} cm?"
        wrongs = [p * l, p + l, 2 * p + l]
    else:
        a = random.randint(lo, hi)
        b = random.randint(lo, hi)
        c = random.randint(lo, hi)
        k = a + b + c
        soal = f"Berapa keliling segitiga dengan sisi {a} cm, {b} cm, dan {c} cm?"
        wrongs = [k + a, k - b, k * 2]
    choices, letter = _c(str(k), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_luas_persegi_dan_persegi_panjang(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    shape = random.choice(["persegi", "persegi panjang"])
    if shape == "persegi":
        s = random.randint(lo, hi)
        ans = s * s
        soal = f"Berapa luas persegi dengan sisi {s} cm?"
        wrongs = [4 * s, s * (s + 1), (s + 1) ** 2]
    else:
        p = random.randint(lo, hi)
        l = random.randint(lo, hi)
        ans = p * l
        soal = f"Berapa luas persegi panjang dengan panjang {p} cm dan lebar {l} cm?"
        wrongs = [2 * (p + l), p * (l + 1), (p + 1) * l]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_luas_bangun_datar(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 30)
    lo = min(lo, hi)
    shape = random.choice(["segitiga", "jajar genjang", "trapesium"])
    if shape == "segitiga":
        a = random.randint(lo, hi)
        t = random.randint(lo, hi)
        ans = a * t // 2
        soal = f"Berapa luas segitiga dengan alas {a} cm dan tinggi {t} cm?"
        wrongs = [a * t, a + t, a * t // 3]
    elif shape == "jajar genjang":
        a = random.randint(lo, hi)
        t = random.randint(lo, hi)
        ans = a * t
        soal = f"Berapa luas jajar genjang dengan alas {a} cm dan tinggi {t} cm?"
        wrongs = [2 * (a + t), a * t // 2, a * (t + 1)]
    else:
        a = random.randint(lo, hi)
        b = random.randint(lo, hi)
        t = random.randint(lo, hi)
        ans = (a + b) * t // 2
        soal = f"Berapa luas trapesium dengan sisi sejajar {a} cm dan {b} cm, tinggi {t} cm?"
        wrongs = [(a + b) * t, ans + t, ans - a]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_luas_lingkaran(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    r = random.randint(1, hi)
    ans = round(math.pi * r * r, 2)
    soal = f"Berapa luas lingkaran dengan jari-jari {r} cm? (gunakan π = 3.14)"
    ans_pi = round(3.14 * r * r, 2)
    wrongs = [round(2 * 3.14 * r, 2), round(3.14 * r, 2), round(3.14 * (r + 1) ** 2, 2)]
    choices, letter = _c(_fmt(ans_pi), [_fmt(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_keliling_lingkaran(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    r = random.randint(1, hi)
    ans = round(2 * 3.14 * r, 2)
    soal = f"Berapa keliling lingkaran dengan jari-jari {r} cm? (gunakan π = 3.14)"
    wrongs = [round(3.14 * r * r, 2), round(3.14 * r, 2), round(2 * 3.14 * (r + 1), 2)]
    choices, letter = _c(_fmt(ans), [_fmt(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_sudut_dan_jenis_sudut(difficulty, age):
    angles = [
        (30, "sudut lancip", ["sudut siku-siku", "sudut tumpul", "sudut lurus"]),
        (90, "sudut siku-siku", ["sudut lancip", "sudut tumpul", "sudut lurus"]),
        (120, "sudut tumpul", ["sudut lancip", "sudut siku-siku", "sudut lurus"]),
        (180, "sudut lurus", ["sudut lancip", "sudut siku-siku", "sudut tumpul"]),
        (45, "sudut lancip", ["sudut siku-siku", "sudut tumpul", "sudut lurus"]),
        (135, "sudut tumpul", ["sudut lancip", "sudut siku-siku", "sudut lurus"]),
    ]
    deg, correct, wrongs = random.choice(angles)
    soal = f"Sudut {deg}° termasuk jenis sudut apa?"
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_volume_kubus_dan_balok(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 15)
    lo = min(lo, hi)
    shape = random.choice(["kubus", "balok"])
    if shape == "kubus":
        s = random.randint(2, hi)
        ans = s ** 3
        soal = f"Berapa volume kubus dengan sisi {s} cm?"
        wrongs = [s ** 2, 6 * s ** 2, (s + 1) ** 3]
    else:
        p = random.randint(2, hi)
        l = random.randint(2, hi)
        t = random.randint(2, hi)
        ans = p * l * t
        soal = f"Berapa volume balok dengan panjang {p} cm, lebar {l} cm, dan tinggi {t} cm?"
        wrongs = [2 * (p * l + l * t + p * t), p * l, ans + p]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_volume_prisma_dan_tabung(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 15)
    lo = min(lo, hi)
    r = random.randint(2, hi)
    t = random.randint(2, hi)
    ans = round(3.14 * r * r * t, 2)
    soal = f"Berapa volume tabung dengan jari-jari {r} cm dan tinggi {t} cm? (π = 3.14)"
    wrongs = [round(2 * 3.14 * r * t, 2), round(3.14 * r * t, 2), round(3.14 * (r + 1) ** 2 * t, 2)]
    choices, letter = _c(_fmt(ans), [_fmt(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_sifat_bangun_ruang(difficulty, age):
    shapes = [
        ("Kubus", "rusuk", "12", ["8", "6", "4"]),
        ("Kubus", "sisi", "6", ["8", "12", "4"]),
        ("Kubus", "titik sudut", "8", ["6", "12", "4"]),
        ("Balok", "rusuk", "12", ["8", "6", "4"]),
        ("Bola", "sisi lengkung", "1", ["2", "0", "3"]),
        ("Tabung", "sisi", "3", ["2", "4", "6"]),
        ("Kerucut", "titik sudut", "1", ["0", "2", "3"]),
    ]
    shape, prop, correct, wrongs = random.choice(shapes)
    soal = f"{shape} memiliki berapa {prop}?"
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_mean_median_modus(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    n = random.randint(5, 8)
    data = [random.randint(lo, hi) for _ in range(n)]
    mode_val = random.randint(lo, hi)
    data[0] = mode_val
    data[1] = mode_val
    stat_type = random.choice(["mean", "median", "modus"])
    if stat_type == "mean":
        ans = round(sum(data) / len(data), 2)
        soal = f"Data: {data}. Berapa mean (rata-rata) dari data tersebut?"
        correct = _fmt(ans)
        wrongs = [_fmt(ans + 1), _fmt(ans - 1), _fmt(ans + 0.5)]
    elif stat_type == "median":
        sorted_data = sorted(data)
        mid = len(sorted_data) // 2
        if len(sorted_data) % 2 == 0:
            ans = (sorted_data[mid - 1] + sorted_data[mid]) / 2
        else:
            ans = sorted_data[mid]
        soal = f"Data: {sorted(data)}. Berapa median dari data tersebut?"
        correct = _fmt(ans)
        wrongs = [_fmt(ans + 1), _fmt(ans - 1), str(sorted_data[0])]
    else:
        try:
            ans = statistics.mode(data)
        except Exception:
            ans = mode_val
        soal = f"Data: {data}. Berapa modus dari data tersebut?"
        correct = str(ans)
        wrongs = [str(ans + 1), str(ans + 2), str(data[-1] if data[-1] != ans else data[-2])]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


# ---------------------------------------------------------------------------
# MENENGAH
# ---------------------------------------------------------------------------

def _gen_bilangan_bulat_lanjutan(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 50)
    lo = min(lo, hi)
    mode = random.choice(["abs", "ops"])
    if mode == "abs":
        n = random.randint(-hi, hi)
        ans = abs(n)
        soal = f"Berapa nilai mutlak |{n}|?"
        wrongs = [ans + 1, -ans if ans != 0 else 1, ans + 2]
    else:
        a = random.randint(-hi, 0)
        b = random.randint(0, hi)
        ops = random.choice(['+', '-', '×'])
        if ops == '+':
            ans = a + b
            soal = f"Berapa ({a}) + ({b})?"
        elif ops == '-':
            ans = a - b
            soal = f"Berapa ({a}) - ({b})?"
        else:
            ans = a * b
            soal = f"Berapa ({a}) × ({b})?"
        wrongs = [ans + 1, ans - 1, -ans]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bilangan_berpangkat(difficulty, age):
    bases = [2, 3, 4, 5, 6, 7, 8, 9, 10]
    exps = [2, 3, 4]
    base = random.choice(bases)
    exp = random.choice(exps)
    ans = base ** exp
    soal = f"Berapa nilai dari {base}^{exp}?"
    wrongs = [base * exp, ans + base, (base + 1) ** exp]
    choices, letter = _c(str(ans), [str(w) for w in wrongs if str(w) != str(ans)])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bentuk_akar(difficulty, age):
    perfect_squares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
    n = random.choice(perfect_squares)
    ans = int(math.sqrt(n))
    soal = f"Berapa nilai dari √{n}?"
    wrongs = [ans + 1, ans - 1 if ans > 1 else ans + 2, ans + 2]
    choices, letter = _c(str(ans), [str(w) for w in wrongs])
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_himpunan(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 10)
    lo = min(lo, hi)
    all_elems = list(range(1, hi + 1))
    n_a = random.randint(3, min(6, hi))
    n_b = random.randint(3, min(6, hi))
    A = set(random.sample(all_elems, n_a))
    B = set(random.sample(all_elems, n_b))
    op = random.choice(["union", "intersect", "count"])
    if op == "union":
        ans = sorted(A | B)
        soal = f"Jika A = {sorted(A)} dan B = {sorted(B)}, berapa banyak anggota A ∪ B?"
        correct = str(len(ans))
        wrongs = [str(len(A)), str(len(B)), str(len(A) + len(B))]
    elif op == "intersect":
        inter = A & B
        ans = sorted(inter)
        soal = f"Jika A = {sorted(A)} dan B = {sorted(B)}, berapa banyak anggota A ∩ B?"
        correct = str(len(ans))
        wrongs = [str(len(A)), str(len(B)), str(len(A | B))]
    else:
        union = A | B
        soal = f"Jika n(A) = {len(A)}, n(B) = {len(B)}, dan n(A ∩ B) = {len(A & B)}, berapa n(A ∪ B)?"
        correct = str(len(union))
        wrongs = [str(len(A) + len(B)), str(len(A)), str(len(B))]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_aljabar_dasar(difficulty, age):
    mode = random.choice(["simplify", "substitute"])
    if mode == "simplify":
        a = random.randint(1, 9)
        b = random.randint(1, 9)
        ans = a + b
        soal = f"Sederhanakan: {a}x + {b}x"
        correct = f"{ans}x"
        wrongs = [f"{ans + 1}x", f"{ans - 1}x", f"{a * b}x"]
    else:
        a = random.randint(1, 9)
        b = random.randint(1, 9)
        x = random.randint(1, 9)
        ans = a * x + b
        soal = f"Jika x = {x}, berapa nilai dari {a}x + {b}?"
        correct = str(ans)
        wrongs = [str(ans + a), str(ans - b), str(a * x)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_persamaan_linear_satu_variabel(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    a = random.randint(1, 9)
    x = random.randint(1, hi)
    b = random.randint(0, hi)
    c = a * x + b
    soal = f"Selesaikan: {a}x + {b} = {c}, nilai x = ?"
    correct = str(x)
    wrongs = [str(x + 1), str(x - 1) if x > 1 else str(x + 2), str(c // a)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_sistem_persamaan_linear_dua_variabel(difficulty, age):
    x = random.randint(1, 9)
    y = random.randint(1, 9)
    a1, b1 = random.randint(1, 5), random.randint(1, 5)
    a2, b2 = random.randint(1, 5), random.randint(1, 5)
    c1 = a1 * x + b1 * y
    c2 = a2 * x + b2 * y
    soal = f"Selesaikan sistem:\n{a1}x + {b1}y = {c1}\n{a2}x + {b2}y = {c2}\nNilai x + y = ?"
    ans = x + y
    correct = str(ans)
    wrongs = [str(ans + 1), str(ans - 1), str(x * y)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_persamaan_kuadrat(difficulty, age):
    r1 = random.randint(-9, 9)
    r2 = random.randint(-9, 9)
    b = -(r1 + r2)
    c = r1 * r2
    sign_b = "+" if b >= 0 else "-"
    sign_c = "+" if c >= 0 else "-"
    soal = f"Akar-akar dari x^2 {sign_b} {abs(b)}x {sign_c} {abs(c)} = 0 adalah?"
    correct = f"x = {min(r1,r2)} atau x = {max(r1,r2)}"
    wrongs = [
        f"x = {min(r1,r2)+1} atau x = {max(r1,r2)+1}",
        f"x = {-min(r1,r2)} atau x = {-max(r1,r2)}",
        f"x = {b} atau x = {c}",
    ]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_fungsi_kuadrat(difficulty, age):
    a = random.choice([-3, -2, -1, 1, 2, 3])
    b = random.randint(-5, 5)
    c = random.randint(-5, 5)
    k = random.randint(-5, 5)
    ans = a * k * k + b * k + c
    soal = f"Fungsi f(x) = {a}x^2 + {b}x + {c}. Berapa nilai f({k})?"
    correct = str(ans)
    wrongs = [str(ans + a), str(ans - b), str(ans * 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_relasi_dan_fungsi(difficulty, age):
    a = random.randint(1, 9)
    b = random.randint(0, 9)
    k = random.randint(1, 9)
    ans = a * k + b
    soal = f"Jika f(x) = {a}x + {b}, berapa nilai f({k})?"
    correct = str(ans)
    wrongs = [str(ans + a), str(ans - b), str(a * k)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_persamaan_garis_lurus(difficulty, age):
    mode = random.choice(["slope", "evaluate"])
    if mode == "slope":
        x1 = random.randint(-5, 5)
        y1 = random.randint(-5, 5)
        x2 = random.randint(-5, 5)
        while x2 == x1:
            x2 = random.randint(-5, 5)
        y2 = random.randint(-5, 5)
        if x2 - x1 == 0:
            x2 += 1
        m_num = y2 - y1
        m_den = x2 - x1
        g = math.gcd(abs(m_num), abs(m_den))
        m_num //= g
        m_den //= g
        if m_den < 0:
            m_num = -m_num
            m_den = -m_den
        if m_den == 1:
            correct = str(m_num)
        else:
            correct = f"{m_num}/{m_den}"
        soal = f"Berapa gradien garis yang melalui titik ({x1},{y1}) dan ({x2},{y2})?"
        wrongs = [str(m_num + 1), str(m_num - 1), str(m_den)]
    else:
        m = random.randint(-5, 5)
        c2 = random.randint(-5, 5)
        x = random.randint(-5, 5)
        ans = m * x + c2
        soal = f"Garis y = {m}x + {c2}. Berapa nilai y jika x = {x}?"
        correct = str(ans)
        wrongs = [str(ans + m), str(ans - c2), str(m * x)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_perbandingan_senilai(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    rate = random.randint(2, 9)
    unit = random.randint(lo, hi)
    total_units = random.randint(unit + 1, unit * 3)
    ans = rate * total_units
    ref = rate * unit
    soal = f"Jika {unit} barang harganya Rp{ref:,}, berapa harga {total_units} barang?"
    correct = f"Rp{ans:,}"
    wrongs = [f"Rp{ans + rate:,}", f"Rp{ans - ref:,}" if ans > ref else f"Rp{ans + ref:,}", f"Rp{ref * 2:,}"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_perbandingan_berbalik_nilai(difficulty, age):
    lo, hi = _rng(difficulty)
    workers1 = random.randint(2, 10)
    days1 = random.randint(5, 20)
    workers2 = random.randint(2, 10)
    days2 = (workers1 * days1) // workers2
    soal = f"{workers1} pekerja menyelesaikan pekerjaan dalam {days1} hari. Berapa hari jika dikerjakan {workers2} pekerja?"
    correct = str(days2)
    wrongs = [str(days2 + 1), str(days2 - 1) if days2 > 1 else str(days2 + 2), str(days1 * workers2 // workers1 + 1)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_aritmatika_sosial(difficulty, age):
    cost = random.randint(10, 50) * 1000
    mode = random.choice(["profit", "discount"])
    if mode == "profit":
        profit_pct = random.choice([10, 15, 20, 25])
        sell = cost + cost * profit_pct // 100
        soal = f"Modal Rp{cost:,}, dijual dengan untung {profit_pct}%. Harga jual adalah?"
        correct = f"Rp{sell:,}"
        wrongs = [f"Rp{sell + 1000:,}", f"Rp{cost:,}", f"Rp{cost * 2:,}"]
    else:
        price = random.randint(20, 100) * 1000
        disc_pct = random.choice([10, 20, 25, 30])
        disc = price * disc_pct // 100
        final = price - disc
        soal = f"Harga barang Rp{price:,}, diskon {disc_pct}%. Harga setelah diskon adalah?"
        correct = f"Rp{final:,}"
        wrongs = [f"Rp{final + 5000:,}", f"Rp{price:,}", f"Rp{disc:,}"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_teorema_pythagoras(difficulty, age):
    pythagorean = [(3,4,5),(5,12,13),(8,15,17),(7,24,25),(9,40,41),(6,8,10),(9,12,15)]
    a, b, c = random.choice(pythagorean)
    mode = random.choice(["hyp", "leg"])
    if mode == "hyp":
        soal = f"Segitiga siku-siku dengan sisi {a} cm dan {b} cm. Berapa sisi miringnya?"
        correct = str(c)
        wrongs = [str(c + 1), str(a + b), str(c - 1)]
    else:
        soal = f"Segitiga siku-siku dengan sisi miring {c} cm dan salah satu sisi {a} cm. Berapa sisi lainnya?"
        correct = str(b)
        wrongs = [str(b + 1), str(c - a), str(b - 1) if b > 1 else str(b + 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_garis_dan_sudut(difficulty, age):
    mode = random.choice(["supplementary", "complementary", "vertical"])
    if mode == "supplementary":
        a = random.randint(1, 179)
        b = 180 - a
        soal = f"Dua sudut saling berpelurus. Jika satu sudut {a}°, berapakah sudut lainnya?"
        correct = f"{b}°"
        wrongs = [f"{b+1}°", f"{90-a}°" if a < 90 else f"{b-1}°", f"{180+a}°"]
    elif mode == "complementary":
        a = random.randint(1, 89)
        b = 90 - a
        soal = f"Dua sudut saling berpenyiku. Jika satu sudut {a}°, berapakah sudut lainnya?"
        correct = f"{b}°"
        wrongs = [f"{b+1}°", f"{b-1}°", f"{180-a}°"]
    else:
        a = random.randint(1, 179)
        soal = f"Dua sudut bertolak belakang. Jika satu sudut {a}°, berapakah sudut yang bertolak belakang?"
        correct = f"{a}°"
        wrongs = [f"{180-a}°", f"{a+1}°", f"{a-1}°" if a > 1 else f"{a+2}°"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_segitiga(difficulty, age):
    mode = random.choice(["angle_sum", "classify", "area"])
    if mode == "angle_sum":
        a = random.randint(30, 80)
        b = random.randint(30, 80)
        c = 180 - a - b
        soal = f"Segitiga memiliki dua sudut {a}° dan {b}°. Berapa sudut ketiga?"
        correct = f"{c}°"
        wrongs = [f"{c+1}°", f"{c-1}°", f"{180-a}°"]
    elif mode == "classify":
        options = [
            (60, "sama sisi", ["siku-siku", "tumpul", "sembarang"]),
            (90, "siku-siku", ["sama sisi", "tumpul", "lancip"]),
            (120, "tumpul", ["siku-siku", "sama sisi", "lancip"]),
            (45, "lancip", ["tumpul", "siku-siku", "sama sisi"]),
        ]
        ang, correct, wrongs = random.choice(options)
        soal = f"Segitiga dengan sudut terbesar {ang}° disebut segitiga?"
        choices, letter = _c(correct, wrongs)
        return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}
    else:
        base = random.randint(3, 20)
        h = random.randint(3, 20)
        ans = base * h // 2
        soal = f"Berapa luas segitiga dengan alas {base} cm dan tinggi {h} cm?"
        correct = str(ans)
        wrongs = [str(base * h), str(ans + base), str(ans - h) if ans > h else str(ans + h)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_segiempat(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 20)
    lo = min(lo, hi)
    shape = random.choice(["belah ketupat", "jajar genjang", "trapesium"])
    if shape == "belah ketupat":
        s = random.randint(lo, hi)
        t = random.randint(lo, hi)
        area = s * t
        soal = f"Berapa luas belah ketupat dengan diagonal {s} cm dan {t} cm?"
        correct = str(area // 2)
        wrongs = [str(area), str(area // 2 + s), str(2 * (s + t))]
    elif shape == "jajar genjang":
        a = random.randint(lo, hi)
        t = random.randint(lo, hi)
        area = a * t
        soal = f"Berapa luas jajar genjang dengan alas {a} cm dan tinggi {t} cm?"
        correct = str(area)
        wrongs = [str(area // 2), str(2 * (a + t)), str(area + a)]
    else:
        a = random.randint(lo, hi)
        b = random.randint(lo, hi)
        t = random.randint(lo, hi)
        area = (a + b) * t // 2
        soal = f"Berapa luas trapesium dengan sisi sejajar {a} cm dan {b} cm, tinggi {t} cm?"
        correct = str(area)
        wrongs = [str((a + b) * t), str(area + t), str(area - a) if area > a else str(area + 1)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_lingkaran(difficulty, age):
    r = random.randint(3, 15)
    mode = random.choice(["arc", "sector"])
    angle = random.choice([30, 45, 60, 90, 120])
    if mode == "arc":
        arc = round(angle / 360 * 2 * 3.14 * r, 2)
        soal = f"Lingkaran dengan jari-jari {r} cm. Berapa panjang busur dengan sudut pusat {angle}°? (π = 3.14)"
        correct = _fmt(arc)
        wrongs = [_fmt(arc + r), _fmt(2 * 3.14 * r), _fmt(arc * 2)]
    else:
        sector = round(angle / 360 * 3.14 * r * r, 2)
        soal = f"Lingkaran dengan jari-jari {r} cm. Berapa luas juring dengan sudut pusat {angle}°? (π = 3.14)"
        correct = _fmt(sector)
        wrongs = [_fmt(sector * 2), _fmt(3.14 * r * r), _fmt(sector + r)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_kesebangunan_dan_kekongruenan(difficulty, age):
    scale = random.choice([2, 3, 4])
    a = random.randint(3, 12)
    b = a * scale
    c = random.randint(4, 15)
    d = c * scale
    soal = f"Dua segitiga sebangun. Sisi segitiga pertama {a} cm, sisi segitiga kedua yang bersesuaian {b} cm. Jika sisi lain segitiga pertama {c} cm, berapa sisi bersesuaian pada segitiga kedua?"
    correct = str(d)
    wrongs = [str(d + scale), str(c + b - a), str(d - scale)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bangun_ruang_sisi_datar(difficulty, age):
    lo, hi = _rng(difficulty)
    hi = min(hi, 15)
    lo = min(lo, hi)
    mode = random.choice(["prism_vol", "pyramid_vol"])
    if mode == "prism_vol":
        a = random.randint(2, hi)
        t_seg = random.randint(2, hi)
        t_prism = random.randint(2, hi)
        base_area = a * t_seg // 2
        vol = base_area * t_prism
        soal = f"Prisma segitiga dengan alas segitiga {a} cm, tinggi segitiga {t_seg} cm, tinggi prisma {t_prism} cm. Volume?"
        correct = str(vol)
        wrongs = [str(vol + a), str(a * t_seg * t_prism), str(vol * 2)]
    else:
        s = random.randint(2, hi)
        t = random.randint(2, hi)
        vol = s * s * t // 3
        soal = f"Limas persegi dengan alas {s} cm × {s} cm, tinggi {t} cm. Volume?"
        correct = str(vol)
        wrongs = [str(s * s * t), str(vol + s), str(vol * 3)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_bangun_ruang_sisi_lengkung(difficulty, age):
    r = random.randint(2, 10)
    mode = random.choice(["sphere", "cone"])
    if mode == "sphere":
        vol = round(4 / 3 * 3.14 * r ** 3, 2)
        soal = f"Berapa volume bola dengan jari-jari {r} cm? (π = 3.14)"
        correct = _fmt(vol)
        wrongs = [_fmt(vol + r), _fmt(4 * 3.14 * r ** 2), _fmt(vol * 2)]
    else:
        t = random.randint(2, 10)
        vol = round(1 / 3 * 3.14 * r ** 2 * t, 2)
        soal = f"Berapa volume kerucut dengan jari-jari {r} cm dan tinggi {t} cm? (π = 3.14)"
        correct = _fmt(vol)
        wrongs = [_fmt(3.14 * r ** 2 * t), _fmt(vol + r), _fmt(vol * 3)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_transformasi_geometri(difficulty, age):
    mode = random.choice(["translation", "reflection"])
    if mode == "translation":
        x = random.randint(-5, 5)
        y = random.randint(-5, 5)
        tx = random.randint(-5, 5)
        ty = random.randint(-5, 5)
        nx = x + tx
        ny = y + ty
        soal = f"Titik ({x},{y}) ditranslasikan oleh ({tx},{ty}). Koordinat bayangan?"
        correct = f"({nx},{ny})"
        wrongs = [f"({nx+1},{ny})", f"({nx},{ny+1})", f"({x-tx},{y-ty})"]
    else:
        x = random.randint(-5, 5)
        y = random.randint(-5, 5)
        axis = random.choice(["x", "y"])
        if axis == "x":
            nx, ny = x, -y
            soal = f"Titik ({x},{y}) dicerminkan terhadap sumbu-x. Koordinat bayangan?"
        else:
            nx, ny = -x, y
            soal = f"Titik ({x},{y}) dicerminkan terhadap sumbu-y. Koordinat bayangan?"
        correct = f"({nx},{ny})"
        wrongs = [f"({-nx},{ny})", f"({nx},{-ny})", f"({ny},{nx})"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_statistika(difficulty, age):
    lo, hi = _rng(difficulty)
    lo = min(lo, 10)
    hi = min(hi, 30)
    lo = min(lo, hi)
    if lo > hi:
        lo = 1
    n = random.randint(6, 10)
    data = sorted([random.randint(lo, hi) for _ in range(n)])
    mode = random.choice(["quartile", "range", "variance"])
    if mode == "quartile":
        q1 = data[n // 4]
        soal = f"Data terurut: {data}. Berapa nilai kuartil bawah (Q1)?"
        correct = str(q1)
        wrongs = [str(data[n // 2]), str(data[0]), str(q1 + 1)]
    elif mode == "range":
        r = data[-1] - data[0]
        soal = f"Data: {data}. Berapa jangkauan (range) data tersebut?"
        correct = str(r)
        wrongs = [str(r + 1), str(r - 1) if r > 0 else str(r + 2), str(data[-1])]
    else:
        mean = sum(data) / len(data)
        var = round(sum((x - mean) ** 2 for x in data) / len(data), 2)
        soal = f"Data: {data}. Berapa variansi dari data tersebut?"
        correct = _fmt(var)
        wrongs = [_fmt(var + 1), _fmt(var - 1) if var > 1 else _fmt(var + 2), _fmt(round(math.sqrt(var), 2))]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_peluang(difficulty, age):
    scenarios = [
        ("Sebuah dadu dilempar sekali. Peluang muncul angka genap?", "1/2", ["1/3", "1/6", "2/3"]),
        ("Sebuah koin dilempar. Peluang muncul gambar?", "1/2", ["1/4", "1/3", "3/4"]),
        ("Kartu diambil dari 52 kartu. Peluang kartu As?", "1/13", ["1/4", "1/52", "4/13"]),
        ("Dari 10 kelereng (3 merah, 7 biru), diambil 1. Peluang merah?", "3/10", ["7/10", "1/3", "3/7"]),
    ]
    soal, correct, wrongs = random.choice(scenarios)
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


# ---------------------------------------------------------------------------
# ATAS
# ---------------------------------------------------------------------------

def _gen_eksponen_dan_logaritma(difficulty, age):
    mode = random.choice(["log", "exp"])
    if mode == "log":
        base = random.choice([2, 3, 5, 10])
        exp = random.choice([1, 2, 3, 4])
        result = base ** exp
        soal = f"Berapa nilai dari log_{base}({result})?"
        correct = str(exp)
        wrongs = [str(exp + 1), str(exp - 1) if exp > 1 else str(exp + 2), str(result)]
    else:
        base = random.choice([2, 3, 5])
        exp = random.choice([2, 3, 4])
        ans = base ** exp
        soal = f"Berapa nilai dari {base}^{exp}?"
        correct = str(ans)
        wrongs = [str(ans + base), str(ans - base), str(base * exp)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_sistem_persamaan_linear(difficulty, age):
    x = random.randint(1, 9)
    y = random.randint(1, 9)
    a1, b1 = random.randint(1, 5), random.randint(1, 5)
    a2, b2 = random.randint(1, 5), random.randint(1, 5)
    c1 = a1 * x + b1 * y
    c2 = a2 * x + b2 * y
    soal = f"Selesaikan sistem persamaan:\n{a1}x + {b1}y = {c1}\n{a2}x + {b2}y = {c2}\nNilai x = ?"
    correct = str(x)
    wrongs = [str(x + 1), str(x - 1) if x > 1 else str(x + 2), str(y)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_pertidaksamaan_linear(difficulty, age):
    a = random.randint(1, 5)
    b = random.randint(1, 10)
    c = random.randint(b + 1, b + 20)
    # a*x + b > c  =>  x > (c-b)/a
    rhs = Fraction(c - b, a)
    if rhs.denominator == 1:
        correct = f"x > {rhs.numerator}"
    else:
        correct = f"x > {rhs.numerator}/{rhs.denominator}"
    soal = f"Tentukan himpunan penyelesaian dari {a}x + {b} > {c}!"
    v = rhs + 1
    vn = rhs - 1
    wrongs = [
        f"x > {rhs.numerator + 1}",
        f"x < {rhs.numerator}/{rhs.denominator}" if rhs.denominator != 1 else f"x < {rhs.numerator}",
        f"x > {c}",
    ]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_fungsi(difficulty, age):
    a = random.randint(1, 9)
    b = random.randint(0, 9)
    k = random.randint(1, 9)
    ans = a * k + b
    soal = f"Fungsi f(x) = {a}x + {b}. Berapa nilai f({k})?"
    correct = str(ans)
    wrongs = [str(ans + a), str(ans - b), str(a + b + k)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_komposisi_fungsi(difficulty, age):
    a = random.randint(1, 5)
    b = random.randint(0, 5)
    c = random.randint(1, 5)
    d = random.randint(0, 5)
    k = random.randint(1, 5)
    # f(x) = ax + b, g(x) = cx + d
    # (f∘g)(x) = f(g(x)) = a*(cx+d)+b = acx + ad + b
    gk = c * k + d
    fogk = a * gk + b
    soal = f"Jika f(x) = {a}x + {b} dan g(x) = {c}x + {d}, berapa (f∘g)({k})?"
    correct = str(fogk)
    wrongs = [str(fogk + a), str(fogk - b), str(a * k + d)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_invers_fungsi(difficulty, age):
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    k = random.randint(1, 9)
    # f(x) = ax + b => f^-1(x) = (x - b) / a
    ans_frac = Fraction(k - b, a)
    if ans_frac.denominator == 1:
        correct = str(ans_frac.numerator)
    else:
        correct = f"{ans_frac.numerator}/{ans_frac.denominator}"
    soal = f"Jika f(x) = {a}x + {b}, berapa nilai f^(-1)({k})?"
    wrongs = [str(a * k + b), str(k + b), str(k - b)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_trigonometri_dasar(difficulty, age):
    trig_values = {
        ("sin", 0): "0", ("sin", 30): "1/2", ("sin", 45): "1/2 √2",
        ("sin", 60): "1/2 √3", ("sin", 90): "1",
        ("cos", 0): "1", ("cos", 30): "1/2 √3", ("cos", 45): "1/2 √2",
        ("cos", 60): "1/2", ("cos", 90): "0",
        ("tan", 0): "0", ("tan", 30): "1/3 √3", ("tan", 45): "1",
        ("tan", 60): "√3", ("tan", 90): "tidak terdefinisi",
    }
    fn = random.choice(["sin", "cos", "tan"])
    ang = random.choice([0, 30, 45, 60, 90])
    correct = trig_values[(fn, ang)]
    all_vals = list(set(trig_values.values()))
    wrongs = [v for v in all_vals if v != correct]
    random.shuffle(wrongs)
    wrongs = wrongs[:3]
    soal = f"Berapa nilai dari {fn}({ang}°)?"
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_aturan_sinus_dan_kosinus(difficulty, age):
    # Use pre-computed Pythagorean triples for clean answers
    triples = [(3,4,5),(5,12,13),(8,15,17)]
    a, b, c = random.choice(triples)
    # cos rule: c^2 = a^2 + b^2 - 2ab*cos(C), for right triangle cos(C)=0 so c^2=a^2+b^2
    soal = f"Dalam segitiga siku-siku, dua sisi adalah {a} cm dan {b} cm. Berapa sisi miringnya?"
    correct = str(c)
    wrongs = [str(c + 1), str(a + b), str(c - 1)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_polinomial(difficulty, age):
    a = random.randint(1, 5)
    b = random.randint(-5, 5)
    c = random.randint(-5, 5)
    k = random.randint(-3, 3)
    ans = a * k ** 2 + b * k + c
    sign_b = "+" if b >= 0 else "-"
    sign_c = "+" if c >= 0 else "-"
    soal = f"Berapa nilai dari p(x) = {a}x^2 {sign_b} {abs(b)}x {sign_c} {abs(c)} untuk x = {k}?"
    correct = str(ans)
    wrongs = [str(ans + a), str(ans - b), str(ans * 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_limit_fungsi(difficulty, age):
    a = random.randint(1, 5)
    b = random.randint(0, 5)
    k = random.randint(1, 5)
    # lim x->k of (ax + b) = ak + b
    ans = a * k + b
    soal = f"Berapa nilai dari lim(x→{k}) dari ({a}x + {b})?"
    correct = str(ans)
    wrongs = [str(ans + a), str(ans - b), str(a * k)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_turunan_fungsi(difficulty, age):
    n = random.randint(2, 5)
    a = random.randint(1, 9)
    b = random.randint(0, 9)
    # f(x) = ax^n + bx => f'(x) = n*a*x^(n-1) + b
    k = random.randint(1, 5)
    deriv_at_k = n * a * (k ** (n - 1)) + b
    soal = f"Fungsi f(x) = {a}x^{n} + {b}x. Berapa nilai f'({k})?"
    correct = str(deriv_at_k)
    wrongs = [str(deriv_at_k + n), str(n * a), str(deriv_at_k - b)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_aplikasi_turunan(difficulty, age):
    # f(x) = ax^2 + bx + c, vertex at x = -b/(2a)
    a = random.choice([-3, -2, -1, 1, 2, 3])
    b = random.randint(-10, 10)
    c = random.randint(-5, 5)
    # vertex x = -b / (2a)
    x_v = Fraction(-b, 2 * a)
    y_v = a * x_v ** 2 + b * x_v + c
    if x_v.denominator == 1:
        x_str = str(x_v.numerator)
    else:
        x_str = f"{x_v.numerator}/{x_v.denominator}"
    if y_v.denominator == 1:
        y_str = str(y_v.numerator)
    else:
        y_str = f"{y_v.numerator}/{y_v.denominator}"
    kind = "minimum" if a > 0 else "maksimum"
    sign_b = "+" if b >= 0 else "-"
    sign_c = "+" if c >= 0 else "-"
    soal = f"Fungsi f(x) = {a}x^2 {sign_b} {abs(b)}x {sign_c} {abs(c)}. Di titik x = berapa nilai {kind} terjadi?"
    correct = x_str
    wrongs = [str(x_v.numerator + 1), str(-x_v.numerator), str(x_v.numerator - 1) if x_v.numerator != 0 else "1"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_integral_tak_tentu(difficulty, age):
    n = random.randint(1, 4)
    a = random.randint(1, 9)
    # integral of ax^n = a/(n+1) x^(n+1)
    num = a
    den = n + 1
    g = math.gcd(num, den)
    num //= g
    den //= g
    if den == 1:
        coef = str(num)
    else:
        coef = f"{num}/{den}"
    correct = f"{coef}x^{n+1} + C"
    soal = f"Berapa hasil dari ∫{a}x^{n} dx?"
    wrongs = [
        f"{a}x^{n+1} + C",
        f"{num}x^{n} + C",
        f"{a * n}x^{n-1} + C" if n > 1 else f"{a}x^2 + C",
    ]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_integral_tentu(difficulty, age):
    a_bound = random.randint(0, 3)
    b_bound = random.randint(a_bound + 1, a_bound + 4)
    n = random.randint(1, 3)
    coef = random.randint(1, 5)
    # integral_a^b coef*x^n dx = coef/(n+1) * [b^(n+1) - a^(n+1)]
    ans = Fraction(coef, n + 1) * (b_bound ** (n + 1) - a_bound ** (n + 1))
    if ans.denominator == 1:
        correct = str(ans.numerator)
    else:
        correct = f"{ans.numerator}/{ans.denominator}"
    soal = f"Berapa nilai dari ∫_{a_bound}^{b_bound} {coef}x^{n} dx?"
    wrongs = [
        str(ans.numerator + 1) if ans.denominator == 1 else f"{ans.numerator+1}/{ans.denominator}",
        str(coef * (b_bound - a_bound)),
        str(ans.numerator * 2) if ans.denominator == 1 else f"{ans.numerator*2}/{ans.denominator}",
    ]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_aplikasi_integral(difficulty, age):
    a_bound = random.randint(0, 2)
    b_bound = random.randint(a_bound + 1, a_bound + 3)
    coef = random.randint(1, 4)
    # area under f(x) = coef*x from a to b = coef/2 * (b^2 - a^2)
    ans = Fraction(coef, 2) * (b_bound ** 2 - a_bound ** 2)
    if ans.denominator == 1:
        correct = str(ans.numerator)
    else:
        correct = f"{ans.numerator}/{ans.denominator}"
    soal = f"Berapa luas daerah di bawah kurva f(x) = {coef}x dari x = {a_bound} hingga x = {b_bound}?"
    wrongs = [
        str(ans.numerator + coef),
        str(coef * (b_bound - a_bound)),
        str(ans.numerator * 2) if ans.denominator == 1 else f"{ans.numerator*2}/{ans.denominator}",
    ]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_matriks(difficulty, age):
    mode = random.choice(["add", "scalar"])
    if mode == "add":
        a11 = random.randint(1, 9)
        a12 = random.randint(1, 9)
        a21 = random.randint(1, 9)
        a22 = random.randint(1, 9)
        b11 = random.randint(1, 9)
        b12 = random.randint(1, 9)
        b21 = random.randint(1, 9)
        b22 = random.randint(1, 9)
        r11, r12, r21, r22 = a11+b11, a12+b12, a21+b21, a22+b22
        soal = f"Berapa hasil A + B jika A = [[{a11},{a12}],[{a21},{a22}]] dan B = [[{b11},{b12}],[{b21},{b22}]]? Tulis elemen baris pertama."
        correct = f"[{r11}, {r12}]"
        wrongs = [f"[{r11+1}, {r12}]", f"[{r11}, {r12+1}]", f"[{a11*b11}, {a12*b12}]"]
    else:
        k = random.randint(2, 5)
        a11 = random.randint(1, 9)
        a12 = random.randint(1, 9)
        a21 = random.randint(1, 9)
        a22 = random.randint(1, 9)
        r11, r12, r21, r22 = k*a11, k*a12, k*a21, k*a22
        soal = f"Berapa hasil {k} × A jika A = [[{a11},{a12}],[{a21},{a22}]]? Tulis elemen baris pertama."
        correct = f"[{r11}, {r12}]"
        wrongs = [f"[{r11+k}, {r12}]", f"[{a11+k}, {a12+k}]", f"[{r21}, {r22}]"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_determinan_matriks(difficulty, age):
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    c = random.randint(1, 9)
    d = random.randint(1, 9)
    det = a * d - b * c
    soal = f"Berapa determinan dari matriks [[{a},{b}],[{c},{d}]]?"
    correct = str(det)
    wrongs = [str(det + 1), str(a * d + b * c), str(det - 1) if det != 0 else str(det + 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_transformasi_matriks(difficulty, age):
    a = random.randint(1, 4)
    b = random.randint(1, 4)
    c = random.randint(1, 4)
    d = random.randint(1, 4)
    x = random.randint(1, 5)
    y = random.randint(1, 5)
    rx = a * x + b * y
    ry = c * x + d * y
    soal = f"Matriks [[{a},{b}],[{c},{d}]] × vektor [{x},{y}]. Hasilnya?"
    correct = f"[{rx}, {ry}]"
    wrongs = [f"[{rx+1}, {ry}]", f"[{rx}, {ry+1}]", f"[{a*x}, {d*y}]"]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_vektor_2d(difficulty, age):
    mode = random.choice(["add", "magnitude"])
    if mode == "add":
        x1 = random.randint(-5, 5)
        y1 = random.randint(-5, 5)
        x2 = random.randint(-5, 5)
        y2 = random.randint(-5, 5)
        rx = x1 + x2
        ry = y1 + y2
        soal = f"Vektor a = ({x1},{y1}) dan b = ({x2},{y2}). Berapa a + b?"
        correct = f"({rx},{ry})"
        wrongs = [f"({rx+1},{ry})", f"({rx},{ry+1})", f"({x1-x2},{y1-y2})"]
    else:
        # Use Pythagorean triple for clean answer
        triples = [(3,4,5),(5,12,13),(8,15,17),(6,8,10)]
        x, y, mag = random.choice(triples)
        soal = f"Berapa besar (magnitudo) vektor ({x},{y})?"
        correct = str(mag)
        wrongs = [str(mag + 1), str(x + y), str(mag - 1)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_vektor_3d(difficulty, age):
    ax = random.randint(-5, 5)
    ay = random.randint(-5, 5)
    az = random.randint(-5, 5)
    bx = random.randint(-5, 5)
    by = random.randint(-5, 5)
    bz = random.randint(-5, 5)
    dot = ax * bx + ay * by + az * bz
    soal = f"Berapa hasil perkalian titik (dot product) dari vektor ({ax},{ay},{az}) dan ({bx},{by},{bz})?"
    correct = str(dot)
    wrongs = [str(dot + 1), str(dot - 1), str(ax*bx + ay*by)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_barisan_aritmatika(difficulty, age):
    a1 = random.randint(1, 20)
    d = random.randint(1, 10)
    n = random.randint(5, 15)
    an = a1 + (n - 1) * d
    soal = f"Barisan aritmatika dengan suku pertama {a1} dan beda {d}. Berapa suku ke-{n}?"
    correct = str(an)
    wrongs = [str(an + d), str(an - d), str(a1 + n * d)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_deret_aritmatika(difficulty, age):
    a1 = random.randint(1, 10)
    d = random.randint(1, 5)
    n = random.randint(5, 15)
    an = a1 + (n - 1) * d
    sn = n * (a1 + an) // 2
    soal = f"Berapa jumlah {n} suku pertama barisan aritmatika dengan a1 = {a1} dan beda = {d}?"
    correct = str(sn)
    wrongs = [str(sn + d), str(sn - a1), str(n * an // 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_barisan_geometri(difficulty, age):
    a1 = random.randint(1, 5)
    r = random.randint(2, 4)
    n = random.randint(3, 8)
    an = a1 * r ** (n - 1)
    soal = f"Barisan geometri dengan suku pertama {a1} dan rasio {r}. Berapa suku ke-{n}?"
    correct = str(an)
    wrongs = [str(an * r), str(an + r), str(a1 * r ** n)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_deret_geometri(difficulty, age):
    a1 = random.randint(1, 4)
    r = random.randint(2, 3)
    n = random.randint(3, 7)
    sn = a1 * (r ** n - 1) // (r - 1)
    soal = f"Berapa jumlah {n} suku pertama deret geometri dengan a1 = {a1} dan rasio = {r}?"
    correct = str(sn)
    wrongs = [str(sn + a1), str(sn - r), str(a1 * r ** n)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_permutasi(difficulty, age):
    n = random.randint(4, 8)
    r = random.randint(2, min(n, 4))
    ans = math.factorial(n) // math.factorial(n - r)
    soal = f"Berapa nilai dari P({n},{r}) (permutasi {n} diambil {r})?"
    correct = str(ans)
    wrongs = [str(ans + r), str(math.factorial(n) // math.factorial(r)), str(ans // r)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_kombinasi(difficulty, age):
    n = random.randint(4, 9)
    r = random.randint(2, min(n - 1, 4))
    ans = math.factorial(n) // (math.factorial(r) * math.factorial(n - r))
    soal = f"Berapa nilai dari C({n},{r}) (kombinasi {n} diambil {r})?"
    correct = str(ans)
    wrongs = [str(ans + r), str(math.factorial(n) // math.factorial(n - r)), str(ans - 1) if ans > 1 else str(ans + 1)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_peluang_lanjutan(difficulty, age):
    # P(A|B) = P(A∩B)/P(B)
    # Use simple fractions
    pb_num = random.randint(2, 5)
    pb_den = random.randint(pb_num + 1, pb_num + 4)
    pab_num = random.randint(1, pb_num)
    pab_den = pb_den
    # P(A|B) = pab_num / pb_num
    result = Fraction(pab_num, pb_num)
    if result.denominator == 1:
        correct = str(result.numerator)
    else:
        correct = f"{result.numerator}/{result.denominator}"
    soal = f"Diketahui P(B) = {pb_num}/{pb_den} dan P(A∩B) = {pab_num}/{pab_den}. Berapa P(A|B)?"
    r2 = Fraction(pab_num + 1, pb_num)
    r3 = Fraction(pb_num, pab_num) if pab_num != 0 else Fraction(pb_num + 1, 1)
    r4 = Fraction(pab_num, pb_den)
    def fmt_frac(f):
        return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"
    wrongs = [fmt_frac(r2), fmt_frac(r3), fmt_frac(r4)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_peluang_distribusi_binomial(difficulty, age):
    n = random.randint(3, 7)
    k = random.randint(0, n)
    p = random.choice([0.5, 0.25, 0.75])
    q = 1 - p
    c_nk = math.factorial(n) // (math.factorial(k) * math.factorial(n - k))
    ans = round(c_nk * (p ** k) * (q ** (n - k)), 4)
    soal = f"X ~ B(n={n}, p={p}). Berapa P(X={k})?"
    correct = _fmt(ans)
    alt1 = round(c_nk * (p ** (k + 1)) * (q ** (n - k - 1)) if k < n else ans + 0.01, 4)
    alt2 = round(c_nk * (p ** k) * (q ** (n - k)) + 0.05, 4)
    alt3 = round(p ** k * q ** (n - k), 4)
    wrongs = [_fmt(alt1), _fmt(alt2), _fmt(alt3)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_geometri_dimensi_dua(difficulty, age):
    h = random.randint(-5, 5)
    k = random.randint(-5, 5)
    r = random.randint(1, 8)
    mode = random.choice(["center", "radius"])
    if mode == "center":
        soal = f"Persamaan lingkaran (x - {h})^2 + (y - {k})^2 = {r}^2. Pusat lingkaran adalah?"
        correct = f"({h},{k})"
        wrongs = [f"({-h},{-k})", f"({h+1},{k})", f"({h},{k+1})"]
    else:
        soal = f"Persamaan lingkaran (x - {h})^2 + (y - {k})^2 = {r*r}. Jari-jari lingkaran adalah?"
        correct = str(r)
        wrongs = [str(r + 1), str(r * r), str(r - 1) if r > 1 else str(r + 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_geometri_dimensi_tiga(difficulty, age):
    x1 = random.randint(0, 5)
    y1 = random.randint(0, 5)
    z1 = random.randint(0, 5)
    # Choose offset to make integer distance
    triples_3d = [(1,2,2,3),(2,4,4,6),(1,0,0,1),(0,3,4,5)]
    dx, dy, dz, dist = random.choice(triples_3d)
    x2, y2, z2 = x1 + dx, y1 + dy, z1 + dz
    soal = f"Berapa jarak antara titik ({x1},{y1},{z1}) dan ({x2},{y2},{z2}) dalam ruang 3D?"
    correct = str(dist)
    wrongs = [str(dist + 1), str(dx + dy + dz), str(dist - 1) if dist > 1 else str(dist + 2)]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_geometri_analitik_lingkaran(difficulty, age):
    h = random.randint(-5, 5)
    k = random.randint(-5, 5)
    r = random.randint(1, 8)
    soal = f"Tuliskan persamaan lingkaran dengan pusat ({h},{k}) dan jari-jari {r}!"
    correct = f"(x-{h})^2 + (y-{k})^2 = {r*r}"
    wrongs = [
        f"(x+{h})^2 + (y+{k})^2 = {r*r}",
        f"(x-{h})^2 + (y-{k})^2 = {r}",
        f"(x-{h})^2 + (y-{k})^2 = {r*r + 1}",
    ]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_program_linear(difficulty, age):
    # Simple LP: maximize Z = ax + by subject to constraints
    # Use pre-computed corner points for clean answer
    a = random.randint(1, 5)
    b = random.randint(1, 5)
    corners = [(0, 0), (4, 0), (3, 2), (0, 5)]
    vals = [a * x + b * y for x, y in corners]
    max_val = max(vals)
    max_corner = corners[vals.index(max_val)]
    soal = (f"Maksimumkan Z = {a}x + {b}y pada titik-titik pojok (0,0), (4,0), (3,2), (0,5). "
            f"Nilai maksimum Z adalah?")
    correct = str(max_val)
    other_vals = sorted(set(vals) - {max_val}, reverse=True)
    wrongs = [str(v) for v in other_vals[:3]]
    while len(wrongs) < 3:
        wrongs.append(str(max_val + random.randint(1, 5)))
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


def _gen_statistika_inferensial(difficulty, age):
    mu = random.randint(50, 80)
    sigma = random.randint(5, 20)
    x = random.randint(mu - 2 * sigma, mu + 2 * sigma)
    z = round((x - mu) / sigma, 2)
    soal = f"Nilai rata-rata μ = {mu} dan simpangan baku σ = {sigma}. Berapa z-score untuk x = {x}?"
    correct = _fmt(z)
    wrongs = [_fmt(z + 0.5), _fmt(z - 0.5), _fmt((x - mu) / (sigma + 5))]
    choices, letter = _c(correct, wrongs)
    return {"soal": soal, "pilihan": choices, "jawaban_benar": letter, "difficulty": difficulty}


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def _wrap(fn):
    def wrapper(difficulty, age):
        try:
            return fn(difficulty, age)
        except Exception:
            return None
    return wrapper


_GENERATORS = {
    "mengenal bilangan": _wrap(_gen_mengenal_bilangan),
    "penjumlahan dasar": _wrap(_gen_penjumlahan_dasar),
    "pengurangan dasar": _wrap(_gen_pengurangan_dasar),
    "penjumlahan dan pengurangan dasar": _wrap(_gen_penjumlahan_dan_pengurangan_dasar),
    "pengenalan perkalian": _wrap(_gen_pengenalan_perkalian),
    "pengenalan pembagian": _wrap(_gen_pengenalan_pembagian),
    "perkalian": _wrap(_gen_perkalian),
    "pembagian": _wrap(_gen_pembagian),
    "perkalian dan pembagian": _wrap(_gen_perkalian_dan_pembagian),
    "operasi hitung campuran": _wrap(_gen_operasi_hitung_campuran),
    "bilangan bulat": _wrap(_gen_bilangan_bulat),
    "bilangan romawi": _wrap(_gen_bilangan_romawi),
    "bilangan pecahan": _wrap(_gen_bilangan_pecahan),
    "bilangan desimal": _wrap(_gen_bilangan_desimal),
    "persen": _wrap(_gen_persen),
    "KPK": _wrap(_gen_kpk),
    "FPB": _wrap(_gen_fpb),
    "faktor dan kelipatan": _wrap(_gen_faktor_dan_kelipatan),
    "rasio dan proporsi": _wrap(_gen_rasio_dan_proporsi),
    "nilai uang": _wrap(_gen_nilai_uang),
    "garis bilangan": _wrap(_gen_garis_bilangan),
    "koordinat kartesius sederhana": _wrap(_gen_koordinat_kartesius_sederhana),
    "skala dan denah": _wrap(_gen_skala_dan_denah),
    "pengenalan waktu": _wrap(_gen_pengenalan_waktu),
    "pengukuran waktu": _wrap(_gen_pengukuran_waktu),
    "pengukuran panjang": _wrap(_gen_pengukuran_panjang),
    "pengukuran berat": _wrap(_gen_pengukuran_berat),
    "satuan": _wrap(_gen_satuan),
    "mengenal bangun datar": _wrap(_gen_mengenal_bangun_datar),
    "keliling bangun datar": _wrap(_gen_keliling_bangun_datar),
    "luas persegi dan persegi panjang": _wrap(_gen_luas_persegi_dan_persegi_panjang),
    "luas bangun datar": _wrap(_gen_luas_bangun_datar),
    "luas lingkaran": _wrap(_gen_luas_lingkaran),
    "keliling lingkaran": _wrap(_gen_keliling_lingkaran),
    "sudut dan jenis sudut": _wrap(_gen_sudut_dan_jenis_sudut),
    "volume kubus dan balok": _wrap(_gen_volume_kubus_dan_balok),
    "volume prisma dan tabung": _wrap(_gen_volume_prisma_dan_tabung),
    "sifat bangun ruang": _wrap(_gen_sifat_bangun_ruang),
    "mean median modus": _wrap(_gen_mean_median_modus),
    "bilangan bulat lanjutan": _wrap(_gen_bilangan_bulat_lanjutan),
    "bilangan berpangkat": _wrap(_gen_bilangan_berpangkat),
    "bentuk akar": _wrap(_gen_bentuk_akar),
    "himpunan": _wrap(_gen_himpunan),
    "aljabar dasar": _wrap(_gen_aljabar_dasar),
    "persamaan linear satu variabel": _wrap(_gen_persamaan_linear_satu_variabel),
    "sistem persamaan linear dua variabel": _wrap(_gen_sistem_persamaan_linear_dua_variabel),
    "persamaan kuadrat": _wrap(_gen_persamaan_kuadrat),
    "fungsi kuadrat": _wrap(_gen_fungsi_kuadrat),
    "relasi dan fungsi": _wrap(_gen_relasi_dan_fungsi),
    "persamaan garis lurus": _wrap(_gen_persamaan_garis_lurus),
    "perbandingan senilai": _wrap(_gen_perbandingan_senilai),
    "perbandingan berbalik nilai": _wrap(_gen_perbandingan_berbalik_nilai),
    "aritmatika sosial": _wrap(_gen_aritmatika_sosial),
    "teorema pythagoras": _wrap(_gen_teorema_pythagoras),
    "garis dan sudut": _wrap(_gen_garis_dan_sudut),
    "segitiga": _wrap(_gen_segitiga),
    "segiempat": _wrap(_gen_segiempat),
    "lingkaran": _wrap(_gen_lingkaran),
    "kesebangunan dan kekongruenan": _wrap(_gen_kesebangunan_dan_kekongruenan),
    "bangun ruang sisi datar": _wrap(_gen_bangun_ruang_sisi_datar),
    "bangun ruang sisi lengkung": _wrap(_gen_bangun_ruang_sisi_lengkung),
    "transformasi geometri": _wrap(_gen_transformasi_geometri),
    "statistika": _wrap(_gen_statistika),
    "peluang": _wrap(_gen_peluang),
    "eksponen dan logaritma": _wrap(_gen_eksponen_dan_logaritma),
    "sistem persamaan linear": _wrap(_gen_sistem_persamaan_linear),
    "pertidaksamaan linear": _wrap(_gen_pertidaksamaan_linear),
    "fungsi": _wrap(_gen_fungsi),
    "komposisi fungsi": _wrap(_gen_komposisi_fungsi),
    "invers fungsi": _wrap(_gen_invers_fungsi),
    "trigonometri dasar": _wrap(_gen_trigonometri_dasar),
    "aturan sinus dan kosinus": _wrap(_gen_aturan_sinus_dan_kosinus),
    "polinomial": _wrap(_gen_polinomial),
    "limit fungsi": _wrap(_gen_limit_fungsi),
    "turunan fungsi": _wrap(_gen_turunan_fungsi),
    "aplikasi turunan": _wrap(_gen_aplikasi_turunan),
    "integral tak tentu": _wrap(_gen_integral_tak_tentu),
    "integral tentu": _wrap(_gen_integral_tentu),
    "aplikasi integral": _wrap(_gen_aplikasi_integral),
    "matriks": _wrap(_gen_matriks),
    "determinan matriks": _wrap(_gen_determinan_matriks),
    "transformasi matriks": _wrap(_gen_transformasi_matriks),
    "vektor 2D": _wrap(_gen_vektor_2d),
    "vektor 3D": _wrap(_gen_vektor_3d),
    "barisan aritmatika": _wrap(_gen_barisan_aritmatika),
    "deret aritmatika": _wrap(_gen_deret_aritmatika),
    "barisan geometri": _wrap(_gen_barisan_geometri),
    "deret geometri": _wrap(_gen_deret_geometri),
    "permutasi": _wrap(_gen_permutasi),
    "kombinasi": _wrap(_gen_kombinasi),
    "peluang lanjutan": _wrap(_gen_peluang_lanjutan),
    "peluang distribusi binomial": _wrap(_gen_peluang_distribusi_binomial),
    "geometri dimensi dua": _wrap(_gen_geometri_dimensi_dua),
    "geometri dimensi tiga": _wrap(_gen_geometri_dimensi_tiga),
    "geometri analitik lingkaran": _wrap(_gen_geometri_analitik_lingkaran),
    "program linear": _wrap(_gen_program_linear),
    "statistika inferensial": _wrap(_gen_statistika_inferensial),
}


def generate(topic: str, difficulty: str, age: int = 10):
    """Returns {soal, pilihan, jawaban_benar, difficulty} or None if topic not found."""
    fn = _GENERATORS.get(topic)
    return fn(difficulty, age) if fn else None
