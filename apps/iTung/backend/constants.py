# ============================================================
# iTung - Kumpulan Topik Matematika SD s/d SMA
# Kurikulum Indonesia
# ============================================================

TOPICS_DASAR = [
    "mengenal bilangan",
    "penjumlahan dasar",
    "pengurangan dasar",
    "penjumlahan dan pengurangan dasar",
    "pengenalan perkalian",
    "pengenalan pembagian",
    "perkalian",
    "pembagian",
    "perkalian dan pembagian",
    "operasi hitung campuran",
    "bilangan bulat",
    "bilangan romawi",
    "bilangan pecahan",
    "bilangan desimal",
    "persen",
    "KPK",
    "FPB",
    "faktor dan kelipatan",
    "rasio dan proporsi",
    "nilai uang",
    "garis bilangan",
    "koordinat kartesius sederhana",
    "skala dan denah",
    "pengenalan waktu",
    "pengukuran waktu",
    "pengukuran panjang",
    "pengukuran berat",
    "satuan",
    "mengenal bangun datar",
    "keliling bangun datar",
    "luas persegi dan persegi panjang",
    "luas bangun datar",
    "luas lingkaran",
    "keliling lingkaran",
    "sudut dan jenis sudut",
    "volume kubus dan balok",
    "volume prisma dan tabung",
    "sifat bangun ruang",
    "mean median modus",
]

TOPICS_MENENGAH = [
    "bilangan bulat lanjutan",
    "bilangan berpangkat",
    "bentuk akar",
    "himpunan",
    "aljabar dasar",
    "persamaan linear satu variabel",
    "sistem persamaan linear dua variabel",
    "persamaan kuadrat",
    "fungsi kuadrat",
    "relasi dan fungsi",
    "persamaan garis lurus",
    "perbandingan senilai",
    "perbandingan berbalik nilai",
    "aritmatika sosial",
    "teorema pythagoras",
    "garis dan sudut",
    "segitiga",
    "segiempat",
    "lingkaran",
    "kesebangunan dan kekongruenan",
    "bangun ruang sisi datar",
    "bangun ruang sisi lengkung",
    "transformasi geometri",
    "statistika",
    "peluang",
]

TOPICS_ATAS = [
    "eksponen dan logaritma",
    "sistem persamaan linear",
    "pertidaksamaan linear",
    "fungsi",
    "komposisi fungsi",
    "invers fungsi",
    "trigonometri dasar",
    "aturan sinus dan kosinus",
    "polinomial",
    "limit fungsi",
    "turunan fungsi",
    "aplikasi turunan",
    "integral tak tentu",
    "integral tentu",
    "aplikasi integral",
    "matriks",
    "determinan matriks",
    "transformasi matriks",
    "vektor 2D",
    "vektor 3D",
    "barisan aritmatika",
    "deret aritmatika",
    "barisan geometri",
    "deret geometri",
    "permutasi",
    "kombinasi",
    "peluang lanjutan",
    "peluang distribusi binomial",
    "geometri dimensi dua",
    "geometri dimensi tiga",
    "geometri analitik lingkaran",
    "program linear",
    "statistika inferensial",
]

# ----------------------------------------------------------
# MAPPING TOPIK PER JENJANG
# ----------------------------------------------------------
TOPICS_BY_GRADE = {
    "Dasar": TOPICS_DASAR,
    "Menengah": TOPICS_MENENGAH,
    "Atas": TOPICS_ATAS,
}

# ----------------------------------------------------------
# GABUNGAN SEMUA TOPIK (flat list)
# ----------------------------------------------------------
TOPICS = TOPICS_DASAR + TOPICS_MENENGAH + TOPICS_ATAS

# ----------------------------------------------------------
# TOPIK VISUAL — topik yang diuntungkan oleh diagram/gambar
# ----------------------------------------------------------
VISUAL_TOPICS = {
    "mengenal bangun datar",
    "keliling bangun datar",
    "luas bangun datar",
    "luas persegi dan persegi panjang",
    "luas lingkaran",
    "keliling lingkaran",
    "volume kubus dan balok",
    "volume prisma dan tabung",
    "sifat bangun ruang",
    "bangun ruang sisi datar",
    "bangun ruang sisi lengkung",
    "geometri dimensi dua",
    "geometri dimensi tiga",
    "geometri analitik lingkaran",
    "sudut dan jenis sudut",
    "garis dan sudut",
    "teorema pythagoras",
    "garis bilangan",
    "bilangan pecahan",
    "koordinat kartesius sederhana",
    "pengenalan waktu",
    "pengukuran waktu",
    "transformasi geometri",
    "persamaan garis lurus",
    "fungsi kuadrat",
    "fungsi",
    "vektor 2D",
    "vektor 3D",
    "statistika",
    "mean median modus",
    "trigonometri dasar",
    "aturan sinus dan kosinus",
    "program linear",
    "skala dan denah",
}

# ----------------------------------------------------------
# TOPIK CERITA — topik yang cocok dibungkus soal cerita
# ----------------------------------------------------------
STORY_TOPICS = {
    "aritmatika sosial",
    "rasio dan proporsi",
    "perbandingan senilai",
    "perbandingan berbalik nilai",
    "nilai uang",
    "skala dan denah",
    "persen",
    "aplikasi turunan",
    "aplikasi integral",
    "program linear",
    "peluang",
    "peluang lanjutan",
    "peluang distribusi binomial",
}

# ----------------------------------------------------------
# TOPIK SIMBOLIK — topik manipulasi aljabar/ekspresi
# ----------------------------------------------------------
SYMBOLIC_TOPICS = {
    "aljabar dasar",
    "persamaan linear satu variabel",
    "sistem persamaan linear dua variabel",
    "sistem persamaan linear",
    "pertidaksamaan linear",
    "persamaan kuadrat",
    "polinomial",
    "eksponen dan logaritma",
    "bilangan berpangkat",
    "bentuk akar",
    "limit fungsi",
    "turunan fungsi",
    "integral tak tentu",
    "integral tentu",
    "matriks",
    "determinan matriks",
    "transformasi matriks",
    "komposisi fungsi",
    "invers fungsi",
    "permutasi",
    "kombinasi",
}


if __name__ == "__main__":
    print(f"Total topik    : {len(TOPICS)}")
    print(f"Topik visual   : {len(VISUAL_TOPICS)}")
    print(f"Topik cerita   : {len(STORY_TOPICS)}")
    print(f"Topik simbolik : {len(SYMBOLIC_TOPICS)}")
    print()
    for grade, topics in TOPICS_BY_GRADE.items():
        print(f"{grade}: {len(topics)} topik")