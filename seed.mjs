import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Data 5 Karyawan untuk koleksi `users` (PRD 7.1 & AGENTS.md)
const dataUsers = [
  { id: "dina", nama: "Dina", email: "dina@sedap.id", role: "karyawan" },
  { id: "nisa", nama: "Nisa", email: "nisa@sedap.id", role: "karyawan" },
  { id: "wulan", nama: "Wulan", email: "wulan@sedap.id", role: "hrd" },
  { id: "rama", nama: "Rama", email: "rama@sedap.id", role: "karyawan" },
  { id: "sari", nama: "Sari", email: "sari@sedap.id", role: "karyawan" },
];

// 2. Data Presensi Bulan Ini (Oktober 2026) untuk koleksi `presensi`
// Tanggal kerja: 2026-10-01 s.d. 2026-10-09
const dataPresensi = [
  {
    id: "presensi-dina-2026-10-01",
    karyawanId: "dina",
    tanggal: "2026-10-01",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-01T07:45:00")),
    jamPulang: Timestamp.fromDate(new Date("2026-10-01T17:02:00")),
  },
  {
    id: "presensi-dina-2026-10-02",
    karyawanId: "dina",
    tanggal: "2026-10-02",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-02T07:50:00")),
    jamPulang: Timestamp.fromDate(new Date("2026-10-02T17:05:00")),
  },
  {
    id: "presensi-dina-2026-10-05",
    karyawanId: "dina",
    tanggal: "2026-10-05",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-05T07:48:00")),
    jamPulang: Timestamp.fromDate(new Date("2026-10-05T17:01:00")),
  },
  {
    id: "presensi-dina-2026-10-06",
    karyawanId: "dina",
    tanggal: "2026-10-06",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-06T08:09:00")), // Terlambat
    jamPulang: Timestamp.fromDate(new Date("2026-10-06T17:10:00")),
  },
  {
    id: "presensi-dina-2026-10-07",
    karyawanId: "dina",
    tanggal: "2026-10-07",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-07T07:52:00")),
    jamPulang: Timestamp.fromDate(new Date("2026-10-07T17:03:00")),
  },
  {
    id: "presensi-dina-2026-10-08",
    karyawanId: "dina",
    tanggal: "2026-10-08",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-08T07:44:00")),
    jamPulang: Timestamp.fromDate(new Date("2026-10-08T17:00:00")),
  },
  {
    id: "presensi-dina-2026-10-09",
    karyawanId: "dina",
    tanggal: "2026-10-09",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-09T07:55:00")),
    jamPulang: null, // Hari ini belum pulang
  },
  {
    id: "presensi-rama-2026-10-09",
    karyawanId: "rama",
    tanggal: "2026-10-09",
    jamMasuk: Timestamp.fromDate(new Date("2026-10-09T07:40:00")),
    jamPulang: null,
  },
];

// 3. Data 6 Pengajuan Cuti untuk koleksi `pengajuan_cuti` (status: menunggu, disetujui, ditolak)
const dataPengajuanCuti = [
  {
    id: "C001",
    karyawanId: "dina",
    tanggalMulai: Timestamp.fromDate(new Date("2026-09-24T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-09-25T00:00:00")),
    alasan: "Menghadiri pernikahan saudara di Bandung",
    status: "disetujui",
    catatanHrd: "Disetujui. Selamat untuk keluarga.",
    diajukanPada: Timestamp.fromDate(new Date("2026-09-10T09:15:00")),
  },
  {
    id: "C002",
    karyawanId: "dina",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-01T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-02T00:00:00")),
    alasan: "Urusan keluarga",
    status: "ditolak",
    catatanHrd: "Bertepatan dengan pesanan katering besar. Mohon ajukan tanggal lain.",
    diajukanPada: Timestamp.fromDate(new Date("2026-09-21T13:40:00")),
  },
  {
    id: "C003",
    karyawanId: "dina",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-19T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-21T00:00:00")),
    alasan: "Liburan bersama keluarga",
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.fromDate(new Date("2026-10-05T08:30:00")),
  },
  {
    id: "C004",
    karyawanId: "nisa",
    tanggalMulai: Timestamp.fromDate(new Date("2026-09-14T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-09-14T00:00:00")),
    alasan: "Kontrol kesehatan ke dokter",
    status: "disetujui",
    catatanHrd: "Semoga lekas sehat.",
    diajukanPada: Timestamp.fromDate(new Date("2026-09-08T10:05:00")),
  },
  {
    id: "C005",
    karyawanId: "nisa",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-12T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-13T00:00:00")),
    alasan: "Mengurus pindah rumah",
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.fromDate(new Date("2026-10-02T16:20:00")),
  },
  {
    id: "C006",
    karyawanId: "sari",
    tanggalMulai: Timestamp.fromDate(new Date("2026-10-26T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date("2026-10-26T00:00:00")),
    alasan: "Menghadiri wisuda adik",
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.fromDate(new Date("2026-10-07T11:00:00")),
  },
];

async function seed() {
  console.log("Memulai pengisian data awal (seed) ke Firestore...");

  // 1. Isi koleksi users
  console.log("\n[1/3] Mengisi koleksi 'users'...");
  for (const user of dataUsers) {
    const { id, ...data } = user;
    await setDoc(doc(db, "users", id), data);
    console.log(`  ✓ User ${id} (${data.nama} - ${data.role})`);
  }

  // 2. Isi koleksi presensi
  console.log("\n[2/3] Mengisi koleksi 'presensi'...");
  for (const pres of dataPresensi) {
    const { id, ...data } = pres;
    await setDoc(doc(db, "presensi", id), data);
    console.log(`  ✓ Presensi ${id} (${data.tanggal})`);
  }

  // 3. Isi koleksi pengajuan_cuti
  console.log("\n[3/3] Mengisi koleksi 'pengajuan_cuti'...");
  for (const cuti of dataPengajuanCuti) {
    const { id, ...data } = cuti;
    await setDoc(doc(db, "pengajuan_cuti", id), data);
    console.log(`  ✓ Cuti ${id} (${data.status} - ${data.alasan})`);
  }

  console.log("\n=== SEED SELESAI DENGAN SUKSES ===");
}

seed().catch((err) => {
  console.error("\n[GALAT SEEDING]:", err.message);
  process.exit(1);
});
