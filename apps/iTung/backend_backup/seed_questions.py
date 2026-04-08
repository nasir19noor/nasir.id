"""
Run once to populate the question_bank table.
Usage: python seed_questions.py
"""
from database import SessionLocal, engine, Base
from models import QuestionBank

Base.metadata.create_all(bind=engine)

QUESTIONS = [
    # ── penjumlahan ──────────────────────────────────────────────────────────
    {"topic": "penjumlahan dasar", "difficulty": "sangat_mudah",
     "question_text": "Berapakah hasil dari 3 + 5?",
     "choices": ["A. 6", "B. 7", "C. 8", "D. 9"],
     "correct_answer": "C", "explanation": "3 + 5 = 8"},

    {"topic": "penjumlahan dasar", "difficulty": "mudah",
     "question_text": "Berapakah hasil dari 345 + 278?",
     "choices": ["A. 613", "B. 623", "C. 633", "D. 643"],
     "correct_answer": "B", "explanation": "345 + 278 = 623"},

    {"topic": "penjumlahan dasar", "difficulty": "sedang",
     "question_text": "Pak Budi membeli 1.250 kg beras dan 875 kg jagung. Berapa total beratnya?",
     "choices": ["A. 2.025 kg", "B. 2.125 kg", "C. 2.225 kg", "D. 2.325 kg"],
     "correct_answer": "B", "explanation": "1.250 + 875 = 2.125 kg"},

    {"topic": "penjumlahan dasar", "difficulty": "sulit",
     "question_text": "Hasil dari 4.567 + 3.894 + 2.109 adalah...",
     "choices": ["A. 10.470", "B. 10.570", "C. 10.670", "D. 10.770"],
     "correct_answer": "B", "explanation": "4.567 + 3.894 = 8.461, lalu 8.461 + 2.109 = 10.570"},

    {"topic": "penjumlahan dasar", "difficulty": "sangat_sulit",
     "question_text": "Hasil dari 98.756 + 43.897 + 12.348 adalah...",
     "choices": ["A. 154.901", "B. 155.001", "C. 155.101", "D. 156.001"],
     "correct_answer": "B", "explanation": "98.756 + 43.897 = 142.653, lalu 142.653 + 12.348 = 155.001"},

    # ── pengurangan ──────────────────────────────────────────────────────────
    {"topic": "pengurangan dasar", "difficulty": "sangat_mudah",
     "question_text": "Berapakah hasil dari 9 − 4?",
     "choices": ["A. 3", "B. 4", "C. 5", "D. 6"],
     "correct_answer": "C", "explanation": "9 − 4 = 5"},

    {"topic": "pengurangan dasar", "difficulty": "mudah",
     "question_text": "Berapakah hasil dari 500 − 237?",
     "choices": ["A. 253", "B. 263", "C. 273", "D. 283"],
     "correct_answer": "B", "explanation": "500 − 237 = 263"},

    {"topic": "pengurangan dasar", "difficulty": "sedang",
     "question_text": "Ibu memiliki 2.000 butir manik-manik. Setelah dipakai 847 butir, berapa sisa manik-manik?",
     "choices": ["A. 1.053", "B. 1.153", "C. 1.253", "D. 1.353"],
     "correct_answer": "B", "explanation": "2.000 − 847 = 1.153"},

    {"topic": "pengurangan dasar", "difficulty": "sulit",
     "question_text": "Sebuah gudang berisi 10.000 karung beras. Setelah dijual 3.754 karung dan rusak 1.208 karung, berapa sisa karung?",
     "choices": ["A. 4.938", "B. 5.038", "C. 5.138", "D. 5.238"],
     "correct_answer": "B", "explanation": "10.000 − 3.754 − 1.208 = 5.038"},

    {"topic": "pengurangan dasar", "difficulty": "sangat_sulit",
     "question_text": "Hasil dari 1.000.000 − 456.789 − 234.567 adalah...",
     "choices": ["A. 308.544", "B. 308.644", "C. 309.544", "D. 309.644"],
     "correct_answer": "B", "explanation": "1.000.000 − 456.789 = 543.211, lalu 543.211 − 234.567 = 308.644"},

    # ── perkalian ────────────────────────────────────────────────────────────
    {"topic": "perkalian", "difficulty": "sangat_mudah",
     "question_text": "Berapakah hasil dari 2 × 5?",
     "choices": ["A. 8", "B. 9", "C. 10", "D. 12"],
     "correct_answer": "C", "explanation": "2 × 5 = 10"},

    {"topic": "perkalian", "difficulty": "mudah",
     "question_text": "Berapakah hasil dari 7 × 8?",
     "choices": ["A. 54", "B. 56", "C. 58", "D. 60"],
     "correct_answer": "B", "explanation": "7 × 8 = 56"},

    {"topic": "perkalian", "difficulty": "sedang",
     "question_text": "Sebuah kotak berisi 24 apel. Ada 15 kotak. Berapa total apel?",
     "choices": ["A. 340", "B. 350", "C. 360", "D. 370"],
     "correct_answer": "C", "explanation": "24 × 15 = 360"},

    {"topic": "perkalian", "difficulty": "sulit",
     "question_text": "Berapakah hasil dari 125 × 48?",
     "choices": ["A. 5.800", "B. 5.900", "C. 6.000", "D. 6.100"],
     "correct_answer": "C", "explanation": "125 × 48 = 125 × 40 + 125 × 8 = 5.000 + 1.000 = 6.000"},

    {"topic": "perkalian", "difficulty": "sangat_sulit",
     "question_text": "Berapakah hasil dari 347 × 256?",
     "choices": ["A. 88.532", "B. 88.832", "C. 89.032", "D. 89.232"],
     "correct_answer": "B", "explanation": "347 × 256 = 347 × 200 + 347 × 56 = 69.400 + 19.432 = 88.832"},

    # ── pembagian ────────────────────────────────────────────────────────────
    {"topic": "pembagian", "difficulty": "sangat_mudah",
     "question_text": "Berapakah hasil dari 10 ÷ 2?",
     "choices": ["A. 3", "B. 4", "C. 5", "D. 6"],
     "correct_answer": "C", "explanation": "10 ÷ 2 = 5"},

    {"topic": "pembagian", "difficulty": "mudah",
     "question_text": "Berapakah hasil dari 72 ÷ 9?",
     "choices": ["A. 6", "B. 7", "C. 8", "D. 9"],
     "correct_answer": "C", "explanation": "72 ÷ 9 = 8"},

    {"topic": "pembagian", "difficulty": "sedang",
     "question_text": "252 buku dibagikan sama rata kepada 12 siswa. Berapa buku setiap siswa?",
     "choices": ["A. 19", "B. 21", "C. 23", "D. 25"],
     "correct_answer": "B", "explanation": "252 ÷ 12 = 21"},

    {"topic": "pembagian", "difficulty": "sulit",
     "question_text": "Hasil dari 1.764 ÷ 36 adalah...",
     "choices": ["A. 47", "B. 49", "C. 51", "D. 53"],
     "correct_answer": "B", "explanation": "1.764 ÷ 36 = 49"},

    {"topic": "pembagian", "difficulty": "sangat_sulit",
     "question_text": "Hasil dari 98.436 ÷ 132 adalah...",
     "choices": ["A. 741", "B. 745", "C. 746", "D. 747"],
     "correct_answer": "C", "explanation": "98.436 ÷ 132 = 746"},

    # ── ukuran ───────────────────────────────────────────────────────────────
    {"topic": "pengukuran panjang", "difficulty": "sangat_mudah",
     "question_text": "Berapakah 1 meter sama dengan berapa sentimeter?",
     "choices": ["A. 10 cm", "B. 100 cm", "C. 1.000 cm", "D. 10.000 cm"],
     "correct_answer": "B", "explanation": "1 meter = 100 sentimeter"},

    {"topic": "pengukuran panjang", "difficulty": "mudah",
     "question_text": "Sebuah meja panjangnya 150 cm. Berapa meter panjang meja itu?",
     "choices": ["A. 0,15 m", "B. 1,5 m", "C. 15 m", "D. 150 m"],
     "correct_answer": "B", "explanation": "150 cm ÷ 100 = 1,5 m"},

    {"topic": "pengukuran panjang", "difficulty": "sedang",
     "question_text": "Jarak kota A ke kota B adalah 3,75 km. Jarak kota B ke kota C adalah 2.500 m. Berapa total jarak dalam meter?",
     "choices": ["A. 5.750 m", "B. 6.250 m", "C. 6.750 m", "D. 7.250 m"],
     "correct_answer": "B", "explanation": "3,75 km = 3.750 m. 3.750 + 2.500 = 6.250 m"},

    {"topic": "pengukuran panjang", "difficulty": "sulit",
     "question_text": "Sebuah kolam renang berukuran 25 m × 12,5 m × 1,8 m. Berapa liter volume air kolam tersebut?",
     "choices": ["A. 562.500 liter", "B. 563.500 liter", "C. 564.000 liter", "D. 565.000 liter"],
     "correct_answer": "A", "explanation": "Volume = 25 × 12,5 × 1,8 = 562,5 m³ = 562.500 liter"},

    {"topic": "pengukuran panjang", "difficulty": "sangat_sulit",
     "question_text": "Sebuah benda bergerak dengan kecepatan 72 km/jam. Berapa meter per detik kecepatannya?",
     "choices": ["A. 18 m/s", "B. 20 m/s", "C. 22 m/s", "D. 24 m/s"],
     "correct_answer": "B", "explanation": "72 km/jam = 72.000 m / 3.600 s = 20 m/s"},

    # ── waktu ────────────────────────────────────────────────────────────────
    {"topic": "pengukuran waktu", "difficulty": "sangat_mudah",
     "question_text": "1 jam sama dengan berapa menit?",
     "choices": ["A. 30 menit", "B. 60 menit", "C. 90 menit", "D. 120 menit"],
     "correct_answer": "B", "explanation": "1 jam = 60 menit"},

    {"topic": "pengukuran waktu", "difficulty": "mudah",
     "question_text": "Rini belajar dari pukul 07.30 sampai 09.15. Berapa lama Rini belajar?",
     "choices": ["A. 1 jam 15 menit", "B. 1 jam 30 menit", "C. 1 jam 45 menit", "D. 2 jam"],
     "correct_answer": "C", "explanation": "Dari 07.30 ke 09.15 = 1 jam 45 menit"},

    {"topic": "pengukuran waktu", "difficulty": "sedang",
     "question_text": "Sebuah perjalanan dimulai pukul 06.45 dan berakhir pukul 14.20. Berapa lama perjalanan tersebut?",
     "choices": ["A. 7 jam 25 menit", "B. 7 jam 35 menit", "C. 8 jam 25 menit", "D. 8 jam 35 menit"],
     "correct_answer": "B", "explanation": "Dari 06.45 ke 14.20 = 7 jam 35 menit"},

    {"topic": "pengukuran waktu", "difficulty": "sulit",
     "question_text": "Andi berangkat dari kota A pukul 08.20 dan tiba di kota B pukul 13.05. Jika ia beristirahat 45 menit, berapa lama waktu perjalanan murninya?",
     "choices": ["A. 3 jam 55 menit", "B. 4 jam 0 menit", "C. 4 jam 5 menit", "D. 4 jam 30 menit"],
     "correct_answer": "B", "explanation": "Total waktu = 4 jam 45 menit. Waktu perjalanan murni = 4 jam 45 menit − 45 menit = 4 jam 0 menit"},

    {"topic": "pengukuran waktu", "difficulty": "sangat_sulit",
     "question_text": "Sebuah proyek dimulai 15 Januari 2024 dan harus selesai dalam 100 hari. Tanggal berapa proyek itu harus selesai?",
     "choices": ["A. 23 April 2024", "B. 24 April 2024", "C. 25 April 2024", "D. 26 April 2024"],
     "correct_answer": "B", "explanation": "15 Jan + 100 hari: Jan sisa 16 hari, Feb 29 hari (2024 kabisat), Mar 31 hari, Apr 24 hari = 16+29+31+24=100. Selesai 24 April 2024"},

    # ── berat ────────────────────────────────────────────────────────────────
    {"topic": "pengukuran berat", "difficulty": "sangat_mudah",
     "question_text": "1 kg sama dengan berapa gram?",
     "choices": ["A. 10 gram", "B. 100 gram", "C. 1.000 gram", "D. 10.000 gram"],
     "correct_answer": "C", "explanation": "1 kg = 1.000 gram"},

    {"topic": "pengukuran berat", "difficulty": "mudah",
     "question_text": "Ibu membeli 2,5 kg gula. Berapa gram berat gula itu?",
     "choices": ["A. 250 gram", "B. 2.500 gram", "C. 25.000 gram", "D. 250.000 gram"],
     "correct_answer": "B", "explanation": "2,5 kg × 1.000 = 2.500 gram"},

    {"topic": "pengukuran berat", "difficulty": "sedang",
     "question_text": "Sebuah truk mengangkut 3 ton 450 kg beras. Berapa kg berat muatan itu?",
     "choices": ["A. 3.045 kg", "B. 3.405 kg", "C. 3.450 kg", "D. 3.504 kg"],
     "correct_answer": "C", "explanation": "3 ton = 3.000 kg. 3.000 + 450 = 3.450 kg"},

    {"topic": "pengukuran berat", "difficulty": "sulit",
     "question_text": "Sebuah peti berisi 48 kaleng susu. Berat setiap kaleng 750 gram. Jika berat peti kosong 2,4 kg, berapa kg berat peti berisi penuh?",
     "choices": ["A. 36 kg", "B. 38 kg", "C. 38,4 kg", "D. 40,4 kg"],
     "correct_answer": "C", "explanation": "Berat susu = 48 × 750 g = 36.000 g = 36 kg. Total = 36 + 2,4 = 38,4 kg"},

    {"topic": "pengukuran berat", "difficulty": "sangat_sulit",
     "question_text": "Sebuah kapal mengangkut 12 peti barang. 5 peti beratnya masing-masing 1,25 ton dan 7 peti beratnya masing-masing 850 kg. Berapa total muatan dalam kg?",
     "choices": ["A. 11.950 kg", "B. 12.200 kg", "C. 12.350 kg", "D. 12.450 kg"],
     "correct_answer": "B", "explanation": "5 × 1.250 kg = 6.250 kg. 7 × 850 kg = 5.950 kg. Total = 6.250 + 5.950 = 12.200 kg"},

    # ── panjang ──────────────────────────────────────────────────────────────
    {"topic": "pengukuran panjang", "difficulty": "sangat_mudah",
     "question_text": "1 km sama dengan berapa meter?",
     "choices": ["A. 10 m", "B. 100 m", "C. 1.000 m", "D. 10.000 m"],
     "correct_answer": "C", "explanation": "1 km = 1.000 meter"},

    {"topic": "pengukuran panjang", "difficulty": "mudah",
     "question_text": "Sebuah lintasan lari panjangnya 400 m. Andi berlari sebanyak 5 putaran. Berapa km jarak yang ditempuh Andi?",
     "choices": ["A. 0,2 km", "B. 1 km", "C. 2 km", "D. 20 km"],
     "correct_answer": "C", "explanation": "5 × 400 m = 2.000 m = 2 km"},

    {"topic": "pengukuran panjang", "difficulty": "sedang",
     "question_text": "Panjang pita Ani 4,8 m. Pita itu dipotong menjadi 6 bagian sama panjang. Berapa cm panjang setiap potongan?",
     "choices": ["A. 60 cm", "B. 70 cm", "C. 80 cm", "D. 90 cm"],
     "correct_answer": "C", "explanation": "4,8 m = 480 cm. 480 ÷ 6 = 80 cm"},

    {"topic": "pengukuran panjang", "difficulty": "sulit",
     "question_text": "Jarak sebenarnya antara dua kota adalah 240 km. Pada peta berskala 1:4.000.000, berapa cm jarak kedua kota itu di peta?",
     "choices": ["A. 4 cm", "B. 5 cm", "C. 6 cm", "D. 8 cm"],
     "correct_answer": "C", "explanation": "240 km = 24.000.000 cm. Jarak peta = 24.000.000 ÷ 4.000.000 = 6 cm"},

    {"topic": "pengukuran panjang", "difficulty": "sangat_sulit",
     "question_text": "Sebuah tali dipotong menjadi 3 bagian dengan perbandingan 2:3:5. Jika bagian terpanjang 35 m, berapa panjang tali semula?",
     "choices": ["A. 60 m", "B. 65 m", "C. 70 m", "D. 75 m"],
     "correct_answer": "C", "explanation": "Bagian terpanjang (5 bagian) = 35 m, sehingga 1 bagian = 7 m. Total = (2+3+5) × 7 = 70 m"},

    # ── perhitungan bangun datar ──────────────────────────────────────────────
    {"topic": "luas bangun datar", "difficulty": "sangat_mudah",
     "question_text": "Persegi memiliki sisi 6 cm. Berapakah kelilingnya?",
     "choices": ["A. 18 cm", "B. 24 cm", "C. 30 cm", "D. 36 cm"],
     "correct_answer": "B", "explanation": "Keliling persegi = 4 × sisi = 4 × 6 = 24 cm"},

    {"topic": "luas bangun datar", "difficulty": "mudah",
     "question_text": "Persegi panjang memiliki panjang 12 cm dan lebar 8 cm. Berapakah luasnya?",
     "choices": ["A. 40 cm²", "B. 80 cm²", "C. 96 cm²", "D. 120 cm²"],
     "correct_answer": "C", "explanation": "Luas = panjang × lebar = 12 × 8 = 96 cm²"},

    {"topic": "luas bangun datar", "difficulty": "sedang",
     "question_text": "Sebuah lingkaran memiliki jari-jari 7 cm. Berapakah luasnya? (π = 22/7)",
     "choices": ["A. 44 cm²", "B. 88 cm²", "C. 154 cm²", "D. 308 cm²"],
     "correct_answer": "C", "explanation": "Luas = π × r² = 22/7 × 7 × 7 = 22 × 7 = 154 cm²"},

    {"topic": "luas bangun datar", "difficulty": "sulit",
     "question_text": "Sebuah trapesium memiliki sisi sejajar 8 cm dan 14 cm, serta tinggi 6 cm. Berapakah luasnya?",
     "choices": ["A. 60 cm²", "B. 64 cm²", "C. 66 cm²", "D. 72 cm²"],
     "correct_answer": "C", "explanation": "Luas trapesium = ½ × (a + b) × t = ½ × (8 + 14) × 6 = ½ × 22 × 6 = 66 cm²"},

    {"topic": "luas bangun datar", "difficulty": "sangat_sulit",
     "question_text": "Sebuah layang-layang memiliki diagonal 24 cm dan 18 cm. Di dalamnya terdapat lingkaran dengan jari-jari 4 cm. Berapa luas daerah layang-layang di luar lingkaran? (π = 3,14)",
     "choices": ["A. 141,76 cm²", "B. 155,76 cm²", "C. 165,76 cm²", "D. 171,76 cm²"],
     "correct_answer": "C", "explanation": "Luas layang-layang = ½ × 24 × 18 = 216 cm². Luas lingkaran = 3,14 × 4² = 50,24 cm². Selisih = 216 − 50,24 = 165,76 cm²"},

    # ── garis bilangan ────────────────────────────────────────────────────────
    {"topic": "garis bilangan", "difficulty": "sangat_mudah",
     "question_text": "Pada garis bilangan, bilangan yang terletak di antara 5 dan 7 adalah...",
     "choices": ["A. 4", "B. 6", "C. 8", "D. 9"],
     "correct_answer": "B", "explanation": "Di antara 5 dan 7 terdapat bilangan 6"},

    {"topic": "garis bilangan", "difficulty": "mudah",
     "question_text": "Pada garis bilangan, −3 terletak di sebelah... dari 0.",
     "choices": ["A. kanan", "B. kiri", "C. atas", "D. bawah"],
     "correct_answer": "B", "explanation": "Bilangan negatif terletak di sebelah kiri 0 pada garis bilangan"},

    {"topic": "garis bilangan", "difficulty": "sedang",
     "question_text": "Suhu di kota A adalah −5°C dan suhu di kota B adalah 8°C. Berapa selisih suhunya?",
     "choices": ["A. 3°C", "B. 10°C", "C. 13°C", "D. 15°C"],
     "correct_answer": "C", "explanation": "Selisih = 8 − (−5) = 8 + 5 = 13°C"},

    {"topic": "garis bilangan", "difficulty": "sulit",
     "question_text": "Pada garis bilangan, titik P berada di −7 dan titik Q berada di 11. Titik R adalah titik tengah PQ. Di mana letak titik R?",
     "choices": ["A. 1", "B. 2", "C. 3", "D. 4"],
     "correct_answer": "B", "explanation": "Titik tengah = (−7 + 11) ÷ 2 = 4 ÷ 2 = 2"},

    {"topic": "garis bilangan", "difficulty": "sangat_sulit",
     "question_text": "Pada garis bilangan, diketahui A = −15, B = 9. Titik C membagi AB dengan perbandingan 2:1 dari A. Di mana letak C?",
     "choices": ["A. −1", "B. 0", "C. 1", "D. 3"],
     "correct_answer": "C", "explanation": "Jarak AB = 24. Titik C dari A = 2/3 × 24 = 16. C = −15 + 16 = 1"},

    # ── nilai uang ────────────────────────────────────────────────────────────
    {"topic": "nilai uang", "difficulty": "sangat_mudah",
     "question_text": "Rini memiliki uang Rp 5.000. Ia membeli permen seharga Rp 2.500. Berapa sisa uang Rini?",
     "choices": ["A. Rp 1.500", "B. Rp 2.500", "C. Rp 3.000", "D. Rp 3.500"],
     "correct_answer": "B", "explanation": "5.000 − 2.500 = 2.500"},

    {"topic": "nilai uang", "difficulty": "mudah",
     "question_text": "Budi membeli 3 pensil seharga Rp 2.500 per buah dan 2 buku seharga Rp 5.000 per buah. Berapa total belanjaan Budi?",
     "choices": ["A. Rp 15.000", "B. Rp 17.500", "C. Rp 20.000", "D. Rp 22.500"],
     "correct_answer": "B", "explanation": "3 × 2.500 + 2 × 5.000 = 7.500 + 10.000 = 17.500"},

    {"topic": "nilai uang", "difficulty": "sedang",
     "question_text": "Harga sebuah tas Rp 120.000. Toko memberikan diskon 25%. Berapa harga tas setelah diskon?",
     "choices": ["A. Rp 80.000", "B. Rp 85.000", "C. Rp 90.000", "D. Rp 95.000"],
     "correct_answer": "C", "explanation": "Diskon = 25% × 120.000 = 30.000. Harga setelah diskon = 120.000 − 30.000 = 90.000"},

    {"topic": "nilai uang", "difficulty": "sulit",
     "question_text": "Ani menabung Rp 500.000 dengan bunga 6% per tahun. Setelah 8 bulan, berapa total tabungan Ani?",
     "choices": ["A. Rp 520.000", "B. Rp 524.000", "C. Rp 528.000", "D. Rp 530.000"],
     "correct_answer": "A", "explanation": "Bunga = 500.000 × 6% × 8/12 = 500.000 × 0,04 = 20.000. Total = 520.000"},

    {"topic": "nilai uang", "difficulty": "sangat_sulit",
     "question_text": "Sebuah barang dibeli seharga Rp 800.000 dan dijual dengan keuntungan 15%. Jika pembeli mendapat diskon 10% dari harga jual, berapa yang dibayar pembeli?",
     "choices": ["A. Rp 828.000", "B. Rp 840.000", "C. Rp 856.000", "D. Rp 880.000"],
     "correct_answer": "A", "explanation": "Harga jual = 800.000 × 1,15 = 920.000. Setelah diskon 10% = 920.000 × 0,9 = 828.000"},

    # ── satuan ────────────────────────────────────────────────────────────────
    {"topic": "satuan", "difficulty": "sangat_mudah",
     "question_text": "Satuan yang digunakan untuk mengukur suhu adalah...",
     "choices": ["A. kilogram", "B. meter", "C. derajat Celsius", "D. liter"],
     "correct_answer": "C", "explanation": "Suhu diukur dalam derajat Celsius (°C)"},

    {"topic": "satuan", "difficulty": "mudah",
     "question_text": "5 liter sama dengan berapa mililiter?",
     "choices": ["A. 50 ml", "B. 500 ml", "C. 5.000 ml", "D. 50.000 ml"],
     "correct_answer": "C", "explanation": "1 liter = 1.000 ml, jadi 5 liter = 5.000 ml"},

    {"topic": "satuan", "difficulty": "sedang",
     "question_text": "Sebuah bak mandi berisi 0,75 m³ air. Berapa liter isi bak mandi itu?",
     "choices": ["A. 75 liter", "B. 750 liter", "C. 7.500 liter", "D. 75.000 liter"],
     "correct_answer": "B", "explanation": "1 m³ = 1.000 liter, jadi 0,75 m³ = 750 liter"},

    {"topic": "satuan", "difficulty": "sulit",
     "question_text": "Sebuah mobil mengonsumsi 8 liter bensin per 100 km. Berapa ml bensin yang dibutuhkan untuk 35 km?",
     "choices": ["A. 2.600 ml", "B. 2.700 ml", "C. 2.800 ml", "D. 2.900 ml"],
     "correct_answer": "C", "explanation": "Konsumsi per km = 8.000 ml / 100 = 80 ml/km. Untuk 35 km = 35 × 80 = 2.800 ml"},

    {"topic": "satuan", "difficulty": "sangat_sulit",
     "question_text": "Sebuah tangki berbentuk balok berukuran 2 m × 1,5 m × 0,8 m. Jika diisi air hingga ¾ penuh, berapa liter isinya?",
     "choices": ["A. 1.650 liter", "B. 1.700 liter", "C. 1.750 liter", "D. 1.800 liter"],
     "correct_answer": "D", "explanation": "Volume penuh = 2 × 1,5 × 0,8 = 2,4 m³ = 2.400 liter. ¾ penuh = 2.400 × 0,75 = 1.800 liter"},

    # ── bilangan pecahan ──────────────────────────────────────────────────────
    {"topic": "bilangan pecahan", "difficulty": "sangat_mudah",
     "question_text": "Pecahan yang senilai dengan ½ adalah...",
     "choices": ["A. 1/3", "B. 2/4", "C. 3/5", "D. 4/9"],
     "correct_answer": "B", "explanation": "2/4 = 1/2 karena 2 ÷ 2 = 1 dan 4 ÷ 2 = 2"},

    {"topic": "bilangan pecahan", "difficulty": "mudah",
     "question_text": "Hasil dari ¾ + ⅝ adalah...",
     "choices": ["A. 8/12", "B. 11/8", "C. 12/8", "D. 13/8"],
     "correct_answer": "B",
     "explanation": "¾ = 6/8. Jadi 6/8 + 5/8 = 11/8"},

    {"topic": "bilangan pecahan", "difficulty": "sedang",
     "question_text": "Hasil dari 2⅓ × 1½ adalah...",
     "choices": ["A. 3", "B. 3½", "C. 3⅔", "D. 4"],
     "correct_answer": "B", "explanation": "2⅓ = 7/3 dan 1½ = 3/2. 7/3 × 3/2 = 21/6 = 7/2 = 3½"},

    {"topic": "bilangan pecahan", "difficulty": "sulit",
     "question_text": "Hasil dari 5⅔ ÷ 1⅔ adalah...",
     "choices": ["A. 3", "B. 3⅖", "C. 3½", "D. 4"],
     "correct_answer": "B", "explanation": "5⅔ = 17/3 dan 1⅔ = 5/3. 17/3 ÷ 5/3 = 17/3 × 3/5 = 17/5 = 3⅖"},

    {"topic": "bilangan pecahan", "difficulty": "sangat_sulit",
     "question_text": "Sebuah tangki berisi 4⅓ liter minyak. Setiap hari dipakai ⅔ liter. Setelah berapa hari minyak habis?",
     "choices": ["A. 5 hari", "B. 6 hari", "C. 6½ hari", "D. 7 hari"],
     "correct_answer": "C", "explanation": "4⅓ ÷ ⅔ = 13/3 ÷ 2/3 = 13/3 × 3/2 = 13/2 = 6½ hari"},

    # ── perhitungan besaran sudut ──────────────────────────────────────────────
    {"topic": "sudut dan jenis sudut", "difficulty": "sangat_mudah",
     "question_text": "Berapa derajat sudut siku-siku?",
     "choices": ["A. 45°", "B. 90°", "C. 120°", "D. 180°"],
     "correct_answer": "B", "explanation": "Sudut siku-siku besarnya 90°"},

    {"topic": "sudut dan jenis sudut", "difficulty": "mudah",
     "question_text": "Jumlah sudut dalam segitiga adalah... derajat.",
     "choices": ["A. 90°", "B. 180°", "C. 270°", "D. 360°"],
     "correct_answer": "B", "explanation": "Jumlah sudut dalam segitiga = 180°"},

    {"topic": "sudut dan jenis sudut", "difficulty": "sedang",
     "question_text": "Sebuah segitiga memiliki dua sudut yaitu 65° dan 75°. Berapa besar sudut ketiga?",
     "choices": ["A. 30°", "B. 40°", "C. 50°", "D. 60°"],
     "correct_answer": "B", "explanation": "Sudut ketiga = 180° − 65° − 75° = 40°"},

    {"topic": "sudut dan jenis sudut", "difficulty": "sulit",
     "question_text": "Pada jarum jam pukul 03.00, berapa derajat sudut yang dibentuk jarum jam dan jarum menit?",
     "choices": ["A. 60°", "B. 75°", "C. 90°", "D. 120°"],
     "correct_answer": "C", "explanation": "Pukul 03.00, jarum jam di angka 3 (90° dari 12). Jarum menit di 12 (0°). Sudut = 90°"},

    {"topic": "sudut dan jenis sudut", "difficulty": "sangat_sulit",
     "question_text": "Pada jarum jam pukul 03.40, berapa derajat sudut terkecil yang dibentuk jarum jam dan jarum menit?",
     "choices": ["A. 130°", "B. 135°", "C. 140°", "D. 145°"],
     "correct_answer": "A", "explanation": "Jarum jam pada 03.40: 90° + 40 × 0,5° = 110°. Jarum menit pada 40 menit: 240°. Sudut = |240° − 110°| = 130°"},

    # ── KPK ───────────────────────────────────────────────────────────────────
    {"topic": "KPK", "difficulty": "sangat_mudah",
     "question_text": "KPK dari 4 dan 6 adalah...",
     "choices": ["A. 8", "B. 10", "C. 12", "D. 24"],
     "correct_answer": "C", "explanation": "Kelipatan 4: 4,8,12,16... Kelipatan 6: 6,12,18... KPK = 12"},

    {"topic": "KPK", "difficulty": "mudah",
     "question_text": "KPK dari 12 dan 18 adalah...",
     "choices": ["A. 24", "B. 30", "C. 36", "D. 72"],
     "correct_answer": "C", "explanation": "12 = 2²×3, 18 = 2×3². KPK = 2²×3² = 36"},

    {"topic": "KPK", "difficulty": "sedang",
     "question_text": "Lampu A menyala setiap 4 menit, lampu B setiap 6 menit, lampu C setiap 9 menit. Setelah berapa menit ketiganya menyala bersama-sama?",
     "choices": ["A. 24 menit", "B. 36 menit", "C. 48 menit", "D. 72 menit"],
     "correct_answer": "B", "explanation": "KPK(4,6,9) = 36. Ketiganya menyala bersama setiap 36 menit"},

    {"topic": "KPK", "difficulty": "sulit",
     "question_text": "KPK dari 24, 36, dan 48 adalah...",
     "choices": ["A. 96", "B. 120", "C. 144", "D. 168"],
     "correct_answer": "C", "explanation": "24=2³×3, 36=2²×3², 48=2⁴×3. KPK=2⁴×3²=144"},

    {"topic": "KPK", "difficulty": "sangat_sulit",
     "question_text": "Tiga bus berangkat bersama pukul 06.00. Bus A setiap 15 menit, B setiap 20 menit, C setiap 30 menit. Pukul berapa ketiganya berangkat bersama lagi?",
     "choices": ["A. 06.45", "B. 07.00", "C. 07.30", "D. 08.00"],
     "correct_answer": "B", "explanation": "KPK(15,20,30): 15=3×5, 20=2²×5, 30=2×3×5. KPK=2²×3×5=60 menit. 06.00 + 60 menit = 07.00"},

    # ── FPB ───────────────────────────────────────────────────────────────────
    {"topic": "FPB", "difficulty": "sangat_mudah",
     "question_text": "FPB dari 12 dan 18 adalah...",
     "choices": ["A. 3", "B. 6", "C. 9", "D. 12"],
     "correct_answer": "B", "explanation": "Faktor 12: 1,2,3,4,6,12. Faktor 18: 1,2,3,6,9,18. FPB = 6"},

    {"topic": "FPB", "difficulty": "mudah",
     "question_text": "FPB dari 36 dan 48 adalah...",
     "choices": ["A. 6", "B. 8", "C. 12", "D. 24"],
     "correct_answer": "C", "explanation": "36 = 2²×3², 48 = 2⁴×3. FPB = 2²×3 = 12"},

    {"topic": "FPB", "difficulty": "sedang",
     "question_text": "Ada 48 buku dan 36 pulpen yang akan dibagikan kepada beberapa siswa sama banyak. Berapa siswa yang bisa menerima pembagian tersebut?",
     "choices": ["A. 6 siswa", "B. 12 siswa", "C. 18 siswa", "D. 24 siswa"],
     "correct_answer": "B", "explanation": "FPB(48,36) = 12. Maksimal 12 siswa yang bisa menerima bagian yang sama rata"},

    {"topic": "FPB", "difficulty": "sulit",
     "question_text": "FPB dari 84, 126, dan 210 adalah...",
     "choices": ["A. 14", "B. 21", "C. 42", "D. 63"],
     "correct_answer": "C", "explanation": "84=2²×3×7, 126=2×3²×7, 210=2×3×5×7. FPB=2×3×7=42"},

    {"topic": "FPB", "difficulty": "sangat_sulit",
     "question_text": "Ada 72 roti, 48 kue, dan 120 permen yang akan dimasukkan ke kotak hadiah. Setiap kotak berisi jumlah yang sama untuk masing-masing item. Berapa kotak hadiah maksimal yang bisa dibuat?",
     "choices": ["A. 12 kotak", "B. 16 kotak", "C. 24 kotak", "D. 36 kotak"],
     "correct_answer": "C", "explanation": "72=2³×3², 48=2⁴×3, 120=2³×3×5. FPB=2³×3=24. Maksimal 24 kotak hadiah"},

    # ── bilangan bulat ────────────────────────────────────────────────────────
    {"topic": "bilangan bulat", "difficulty": "sangat_mudah",
     "question_text": "Hasil dari −5 + 8 adalah...",
     "choices": ["A. −13", "B. −3", "C. 3", "D. 13"],
     "correct_answer": "C", "explanation": "−5 + 8 = 3"},

    {"topic": "bilangan bulat", "difficulty": "mudah",
     "question_text": "Hasil dari −12 × (−5) adalah...",
     "choices": ["A. −60", "B. −17", "C. 17", "D. 60"],
     "correct_answer": "D", "explanation": "Negatif × negatif = positif. −12 × −5 = 60"},

    {"topic": "bilangan bulat", "difficulty": "sedang",
     "question_text": "Hasil dari (−8 + 3) × (6 − 10) adalah...",
     "choices": ["A. −20", "B. −8", "C. 8", "D. 20"],
     "correct_answer": "D", "explanation": "(−8 + 3) = −5 dan (6 − 10) = −4. −5 × −4 = 20"},

    {"topic": "bilangan bulat", "difficulty": "sulit",
     "question_text": "Hasil dari (−36) ÷ (−4) + (−7) × 3 adalah...",
     "choices": ["A. −30", "B. −12", "C. −10", "D. −9"],
     "correct_answer": "B", "explanation": "(−36) ÷ (−4) = 9. (−7) × 3 = −21. 9 + (−21) = −12"},

    {"topic": "bilangan bulat", "difficulty": "sangat_sulit",
     "question_text": "Nilai dari [−3 + (−5)] × [7 − (−3)] ÷ 2 adalah...",
     "choices": ["A. −50", "B. −40", "C. 40", "D. 50"],
     "correct_answer": "B", "explanation": "[−3 + (−5)] = −8. [7 − (−3)] = 10. −8 × 10 ÷ 2 = −80 ÷ 2 = −40"},
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
