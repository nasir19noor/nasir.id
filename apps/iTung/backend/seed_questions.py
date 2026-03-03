"""
Run once to populate the question_bank table.
Usage: python seed_questions.py
"""
from database import SessionLocal, engine, Base
from models import QuestionBank

Base.metadata.create_all(bind=engine)

QUESTIONS = [
    # ── penjumlahan ──────────────────────────────────────────────────────────
    {"topic": "penjumlahan", "difficulty": "easy",
     "question_text": "Berapakah hasil dari 345 + 278?",
     "choices": ["A. 613", "B. 623", "C. 633", "D. 643"],
     "correct_answer": "B", "explanation": "345 + 278 = 623"},

    {"topic": "penjumlahan", "difficulty": "medium",
     "question_text": "Pak Budi membeli 1.250 kg beras dan 875 kg jagung. Berapa total beratnya?",
     "choices": ["A. 2.025 kg", "B. 2.125 kg", "C. 2.225 kg", "D. 2.325 kg"],
     "correct_answer": "B", "explanation": "1.250 + 875 = 2.125 kg"},

    {"topic": "penjumlahan", "difficulty": "hard",
     "question_text": "Hasil dari 4.567 + 3.894 + 2.109 adalah...",
     "choices": ["A. 10.470", "B. 10.570", "C. 10.670", "D. 10.770"],
     "correct_answer": "B", "explanation": "4.567 + 3.894 = 8.461, lalu 8.461 + 2.109 = 10.570"},

    # ── pengurangan ──────────────────────────────────────────────────────────
    {"topic": "pengurangan", "difficulty": "easy",
     "question_text": "Berapakah hasil dari 500 − 237?",
     "choices": ["A. 253", "B. 263", "C. 273", "D. 283"],
     "correct_answer": "B", "explanation": "500 − 237 = 263"},

    {"topic": "pengurangan", "difficulty": "medium",
     "question_text": "Ibu memiliki 2.000 butir manik-manik. Setelah dipakai 847 butir, berapa sisa manik-manik?",
     "choices": ["A. 1.053", "B. 1.153", "C. 1.253", "D. 1.353"],
     "correct_answer": "B", "explanation": "2.000 − 847 = 1.153"},

    {"topic": "pengurangan", "difficulty": "hard",
     "question_text": "Sebuah gudang berisi 10.000 karung beras. Setelah dijual 3.754 karung dan rusak 1.208 karung, berapa sisa karung?",
     "choices": ["A. 4.938", "B. 5.038", "C. 5.138", "D. 5.238"],
     "correct_answer": "B", "explanation": "10.000 − 3.754 − 1.208 = 5.038"},

    # ── perkalian ────────────────────────────────────────────────────────────
    {"topic": "perkalian", "difficulty": "easy",
     "question_text": "Berapakah hasil dari 7 × 8?",
     "choices": ["A. 54", "B. 56", "C. 58", "D. 60"],
     "correct_answer": "B", "explanation": "7 × 8 = 56"},

    {"topic": "perkalian", "difficulty": "medium",
     "question_text": "Sebuah kotak berisi 24 apel. Ada 15 kotak. Berapa total apel?",
     "choices": ["A. 340", "B. 350", "C. 360", "D. 370"],
     "correct_answer": "C", "explanation": "24 × 15 = 360"},

    {"topic": "perkalian", "difficulty": "hard",
     "question_text": "Berapakah hasil dari 125 × 48?",
     "choices": ["A. 5.800", "B. 5.900", "C. 6.000", "D. 6.100"],
     "correct_answer": "C", "explanation": "125 × 48 = 125 × 40 + 125 × 8 = 5.000 + 1.000 = 6.000"},

    # ── pembagian ────────────────────────────────────────────────────────────
    {"topic": "pembagian", "difficulty": "easy",
     "question_text": "Berapakah hasil dari 72 ÷ 9?",
     "choices": ["A. 6", "B. 7", "C. 8", "D. 9"],
     "correct_answer": "C", "explanation": "72 ÷ 9 = 8"},

    {"topic": "pembagian", "difficulty": "medium",
     "question_text": "252 buku dibagikan sama rata kepada 12 siswa. Berapa buku setiap siswa?",
     "choices": ["A. 19", "B. 21", "C. 23", "D. 25"],
     "correct_answer": "B", "explanation": "252 ÷ 12 = 21"},

    {"topic": "pembagian", "difficulty": "hard",
     "question_text": "Hasil dari 1.764 ÷ 36 adalah...",
     "choices": ["A. 47", "B. 49", "C. 51", "D. 53"],
     "correct_answer": "B", "explanation": "1.764 ÷ 36 = 49"},

    # ── ukuran ───────────────────────────────────────────────────────────────
    {"topic": "ukuran", "difficulty": "easy",
     "question_text": "1 meter sama dengan berapa sentimeter?",
     "choices": ["A. 10 cm", "B. 100 cm", "C. 1.000 cm", "D. 10.000 cm"],
     "correct_answer": "B", "explanation": "1 meter = 100 sentimeter"},

    {"topic": "ukuran", "difficulty": "medium",
     "question_text": "Sebuah meja panjangnya 150 cm. Berapa meter panjang meja itu?",
     "choices": ["A. 0,15 m", "B. 1,5 m", "C. 15 m", "D. 150 m"],
     "correct_answer": "B", "explanation": "150 cm ÷ 100 = 1,5 m"},

    {"topic": "ukuran", "difficulty": "hard",
     "question_text": "Jarak kota A ke kota B adalah 3,75 km. Jarak kota B ke kota C adalah 2.500 m. Berapa total jarak dalam meter?",
     "choices": ["A. 5.750 m", "B. 6.250 m", "C. 6.750 m", "D. 7.250 m"],
     "correct_answer": "B", "explanation": "3,75 km = 3.750 m. 3.750 + 2.500 = 6.250 m"},

    # ── waktu ────────────────────────────────────────────────────────────────
    {"topic": "waktu", "difficulty": "easy",
     "question_text": "1 jam sama dengan berapa menit?",
     "choices": ["A. 30 menit", "B. 60 menit", "C. 90 menit", "D. 120 menit"],
     "correct_answer": "B", "explanation": "1 jam = 60 menit"},

    {"topic": "waktu", "difficulty": "medium",
     "question_text": "Rini belajar dari pukul 07.30 sampai 09.15. Berapa lama Rini belajar?",
     "choices": ["A. 1 jam 15 menit", "B. 1 jam 30 menit", "C. 1 jam 45 menit", "D. 2 jam"],
     "correct_answer": "C", "explanation": "Dari 07.30 ke 09.15 = 1 jam 45 menit"},

    {"topic": "waktu", "difficulty": "hard",
     "question_text": "Sebuah perjalanan dimulai pukul 06.45 dan berakhir pukul 14.20. Berapa lama perjalanan tersebut?",
     "choices": ["A. 7 jam 25 menit", "B. 7 jam 35 menit", "C. 8 jam 25 menit", "D. 8 jam 35 menit"],
     "correct_answer": "B", "explanation": "Dari 06.45 ke 14.20 = 7 jam 35 menit"},

    # ── berat ────────────────────────────────────────────────────────────────
    {"topic": "berat", "difficulty": "easy",
     "question_text": "1 kg sama dengan berapa gram?",
     "choices": ["A. 10 gram", "B. 100 gram", "C. 1.000 gram", "D. 10.000 gram"],
     "correct_answer": "C", "explanation": "1 kg = 1.000 gram"},

    {"topic": "berat", "difficulty": "medium",
     "question_text": "Ibu membeli 2,5 kg gula. Berapa gram berat gula itu?",
     "choices": ["A. 250 gram", "B. 2.500 gram", "C. 25.000 gram", "D. 250.000 gram"],
     "correct_answer": "B", "explanation": "2,5 kg × 1.000 = 2.500 gram"},

    {"topic": "berat", "difficulty": "hard",
     "question_text": "Sebuah truk mengangkut 3 ton 450 kg beras. Berapa kg berat muatan itu?",
     "choices": ["A. 3.045 kg", "B. 3.405 kg", "C. 3.450 kg", "D. 3.504 kg"],
     "correct_answer": "C", "explanation": "3 ton = 3.000 kg. 3.000 + 450 = 3.450 kg"},

    # ── panjang ──────────────────────────────────────────────────────────────
    {"topic": "panjang", "difficulty": "easy",
     "question_text": "1 km sama dengan berapa meter?",
     "choices": ["A. 10 m", "B. 100 m", "C. 1.000 m", "D. 10.000 m"],
     "correct_answer": "C", "explanation": "1 km = 1.000 meter"},

    {"topic": "panjang", "difficulty": "medium",
     "question_text": "Sebuah lintasan lari panjangnya 400 m. Andi berlari sebanyak 5 putaran. Berapa km jarak yang ditempuh Andi?",
     "choices": ["A. 0,2 km", "B. 1 km", "C. 2 km", "D. 20 km"],
     "correct_answer": "C", "explanation": "5 × 400 m = 2.000 m = 2 km"},

    {"topic": "panjang", "difficulty": "hard",
     "question_text": "Panjang pita Ani 4,8 m. Pita itu dipotong menjadi 6 bagian sama panjang. Berapa cm panjang setiap potongan?",
     "choices": ["A. 60 cm", "B. 70 cm", "C. 80 cm", "D. 90 cm"],
     "correct_answer": "C", "explanation": "4,8 m = 480 cm. 480 ÷ 6 = 80 cm"},

    # ── perhitungan bangun datar ──────────────────────────────────────────────
    {"topic": "perhitungan bangun datar", "difficulty": "easy",
     "question_text": "Persegi memiliki sisi 6 cm. Berapakah kelilingnya?",
     "choices": ["A. 18 cm", "B. 24 cm", "C. 30 cm", "D. 36 cm"],
     "correct_answer": "B", "explanation": "Keliling persegi = 4 × sisi = 4 × 6 = 24 cm"},

    {"topic": "perhitungan bangun datar", "difficulty": "medium",
     "question_text": "Persegi panjang memiliki panjang 12 cm dan lebar 8 cm. Berapakah luasnya?",
     "choices": ["A. 40 cm²", "B. 80 cm²", "C. 96 cm²", "D. 120 cm²"],
     "correct_answer": "C", "explanation": "Luas = panjang × lebar = 12 × 8 = 96 cm²"},

    {"topic": "perhitungan bangun datar", "difficulty": "hard",
     "question_text": "Sebuah lingkaran memiliki jari-jari 7 cm. Berapakah luasnya? (π = 22/7)",
     "choices": ["A. 44 cm²", "B. 88 cm²", "C. 154 cm²", "D. 308 cm²"],
     "correct_answer": "C", "explanation": "Luas = π × r² = 22/7 × 7 × 7 = 22 × 7 = 154 cm²"},

    # ── garis bilangan ────────────────────────────────────────────────────────
    {"topic": "garis bilangan", "difficulty": "easy",
     "question_text": "Pada garis bilangan, bilangan yang terletak di antara 5 dan 7 adalah...",
     "choices": ["A. 4", "B. 6", "C. 8", "D. 9"],
     "correct_answer": "B", "explanation": "Di antara 5 dan 7 terdapat bilangan 6"},

    {"topic": "garis bilangan", "difficulty": "medium",
     "question_text": "Pada garis bilangan, −3 terletak di sebelah... dari 0.",
     "choices": ["A. kanan", "B. kiri", "C. atas", "D. bawah"],
     "correct_answer": "B", "explanation": "Bilangan negatif terletak di sebelah kiri 0 pada garis bilangan"},

    {"topic": "garis bilangan", "difficulty": "hard",
     "question_text": "Suhu di kota A adalah −5°C dan suhu di kota B adalah 8°C. Berapa selisih suhunya?",
     "choices": ["A. 3°C", "B. 10°C", "C. 13°C", "D. 15°C"],
     "correct_answer": "C", "explanation": "Selisih = 8 − (−5) = 8 + 5 = 13°C"},

    # ── nilai uang ────────────────────────────────────────────────────────────
    {"topic": "nilai uang", "difficulty": "easy",
     "question_text": "Rini memiliki uang Rp 5.000. Ia membeli permen seharga Rp 2.500. Berapa sisa uang Rini?",
     "choices": ["A. Rp 1.500", "B. Rp 2.500", "C. Rp 3.000", "D. Rp 3.500"],
     "correct_answer": "B", "explanation": "5.000 − 2.500 = 2.500"},

    {"topic": "nilai uang", "difficulty": "medium",
     "question_text": "Budi membeli 3 pensil seharga Rp 2.500 per buah dan 2 buku seharga Rp 5.000 per buah. Berapa total belanjaan Budi?",
     "choices": ["A. Rp 15.000", "B. Rp 17.500", "C. Rp 20.000", "D. Rp 22.500"],
     "correct_answer": "B", "explanation": "3 × 2.500 + 2 × 5.000 = 7.500 + 10.000 = 17.500"},

    {"topic": "nilai uang", "difficulty": "hard",
     "question_text": "Harga sebuah tas Rp 120.000. Toko memberikan diskon 25%. Berapa harga tas setelah diskon?",
     "choices": ["A. Rp 80.000", "B. Rp 85.000", "C. Rp 90.000", "D. Rp 95.000"],
     "correct_answer": "C", "explanation": "Diskon = 25% × 120.000 = 30.000. Harga setelah diskon = 120.000 − 30.000 = 90.000"},

    # ── satuan ────────────────────────────────────────────────────────────────
    {"topic": "satuan", "difficulty": "easy",
     "question_text": "Satuan yang digunakan untuk mengukur suhu adalah...",
     "choices": ["A. kilogram", "B. meter", "C. derajat Celsius", "D. liter"],
     "correct_answer": "C", "explanation": "Suhu diukur dalam derajat Celsius (°C)"},

    {"topic": "satuan", "difficulty": "medium",
     "question_text": "5 liter sama dengan berapa mililiter?",
     "choices": ["A. 50 ml", "B. 500 ml", "C. 5.000 ml", "D. 50.000 ml"],
     "correct_answer": "C", "explanation": "1 liter = 1.000 ml, jadi 5 liter = 5.000 ml"},

    {"topic": "satuan", "difficulty": "hard",
     "question_text": "Sebuah bak mandi berisi 0,75 m³ air. Berapa liter isi bak mandi itu?",
     "choices": ["A. 75 liter", "B. 750 liter", "C. 7.500 liter", "D. 75.000 liter"],
     "correct_answer": "B", "explanation": "1 m³ = 1.000 liter, jadi 0,75 m³ = 750 liter"},

    # ── bilangan pecahan ──────────────────────────────────────────────────────
    {"topic": "bilangan pecahan", "difficulty": "easy",
     "question_text": "Pecahan yang senilai dengan ½ adalah...",
     "choices": ["A. 1/3", "B. 2/4", "C. 3/5", "D. 4/9"],
     "correct_answer": "B", "explanation": "2/4 = 1/2 karena 2 ÷ 2 = 1 dan 4 ÷ 2 = 2"},

    {"topic": "bilangan pecahan", "difficulty": "medium",
     "question_text": "Hasil dari ¾ + ⅝ adalah...",
     "choices": ["A. 8/12", "B. 11/8", "C. 12/8", "D. 13/8"],
     "correct_answer": "B",
     "explanation": "¾ = 6/8. Jadi 6/8 + 5/8 = 11/8"},

    {"topic": "bilangan pecahan", "difficulty": "hard",
     "question_text": "Hasil dari 2⅓ × 1½ adalah...",
     "choices": ["A. 3", "B. 3½", "C. 3⅔", "D. 4"],
     "correct_answer": "B", "explanation": "2⅓ = 7/3 dan 1½ = 3/2. 7/3 × 3/2 = 21/6 = 7/2 = 3½"},

    # ── perhitungan besaran sudut ──────────────────────────────────────────────
    {"topic": "perhitungan besaran sudut", "difficulty": "easy",
     "question_text": "Berapa derajat sudut siku-siku?",
     "choices": ["A. 45°", "B. 90°", "C. 120°", "D. 180°"],
     "correct_answer": "B", "explanation": "Sudut siku-siku besarnya 90°"},

    {"topic": "perhitungan besaran sudut", "difficulty": "medium",
     "question_text": "Jumlah sudut dalam segitiga adalah... derajat.",
     "choices": ["A. 90°", "B. 180°", "C. 270°", "D. 360°"],
     "correct_answer": "B", "explanation": "Jumlah sudut dalam segitiga = 180°"},

    {"topic": "perhitungan besaran sudut", "difficulty": "hard",
     "question_text": "Sebuah segitiga memiliki dua sudut yaitu 65° dan 75°. Berapa besar sudut ketiga?",
     "choices": ["A. 30°", "B. 40°", "C. 50°", "D. 60°"],
     "correct_answer": "B", "explanation": "Sudut ketiga = 180° − 65° − 75° = 40°"},

    # ── KPK ───────────────────────────────────────────────────────────────────
    {"topic": "KPK", "difficulty": "easy",
     "question_text": "KPK dari 4 dan 6 adalah...",
     "choices": ["A. 8", "B. 10", "C. 12", "D. 24"],
     "correct_answer": "C", "explanation": "Kelipatan 4: 4,8,12,16... Kelipatan 6: 6,12,18... KPK = 12"},

    {"topic": "KPK", "difficulty": "medium",
     "question_text": "KPK dari 12 dan 18 adalah...",
     "choices": ["A. 24", "B. 30", "C. 36", "D. 72"],
     "correct_answer": "C", "explanation": "12 = 2²×3, 18 = 2×3². KPK = 2²×3² = 36"},

    {"topic": "KPK", "difficulty": "hard",
     "question_text": "Lampu A menyala setiap 4 menit, lampu B setiap 6 menit, lampu C setiap 9 menit. Setelah berapa menit ketiganya menyala bersama-sama?",
     "choices": ["A. 24 menit", "B. 36 menit", "C. 48 menit", "D. 72 menit"],
     "correct_answer": "B", "explanation": "KPK(4,6,9) = 36. Ketiganya menyala bersama setiap 36 menit"},

    # ── FPB ───────────────────────────────────────────────────────────────────
    {"topic": "FPB", "difficulty": "easy",
     "question_text": "FPB dari 12 dan 18 adalah...",
     "choices": ["A. 3", "B. 6", "C. 9", "D. 12"],
     "correct_answer": "B", "explanation": "Faktor 12: 1,2,3,4,6,12. Faktor 18: 1,2,3,6,9,18. FPB = 6"},

    {"topic": "FPB", "difficulty": "medium",
     "question_text": "FPB dari 36 dan 48 adalah...",
     "choices": ["A. 6", "B. 8", "C. 12", "D. 24"],
     "correct_answer": "C", "explanation": "36 = 2²×3², 48 = 2⁴×3. FPB = 2²×3 = 12"},

    {"topic": "FPB", "difficulty": "hard",
     "question_text": "Ada 48 buku dan 36 pulpen yang akan dibagikan kepada beberapa siswa sama banyak. Berapa siswa yang bisa menerima pembagian tersebut?",
     "choices": ["A. 6 siswa", "B. 12 siswa", "C. 18 siswa", "D. 24 siswa"],
     "correct_answer": "B", "explanation": "FPB(48,36) = 12. Maksimal 12 siswa yang bisa menerima bagian yang sama rata"},

    # ── bilangan bulat ────────────────────────────────────────────────────────
    {"topic": "bilangan bulat", "difficulty": "easy",
     "question_text": "Hasil dari −5 + 8 adalah...",
     "choices": ["A. −13", "B. −3", "C. 3", "D. 13"],
     "correct_answer": "C", "explanation": "−5 + 8 = 3"},

    {"topic": "bilangan bulat", "difficulty": "medium",
     "question_text": "Hasil dari −12 × (−5) adalah...",
     "choices": ["A. −60", "B. −17", "C. 17", "D. 60"],
     "correct_answer": "D", "explanation": "Negatif × negatif = positif. −12 × −5 = 60"},

    {"topic": "bilangan bulat", "difficulty": "hard",
     "question_text": "Hasil dari (−8 + 3) × (6 − 10) adalah...",
     "choices": ["A. −20", "B. −8", "C. 8", "D. 20"],
     "correct_answer": "D", "explanation": "(−8 + 3) = −5 dan (6 − 10) = −4. −5 × −4 = 20"},
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(QuestionBank).count()
        if existing > 0:
            print(f"Skipping seed: {existing} questions already exist in question_bank.")
            return

        for q in QUESTIONS:
            db.add(QuestionBank(**q))
        db.commit()
        print(f"Seeded {len(QUESTIONS)} questions into question_bank.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
