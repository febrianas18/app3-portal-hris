/**
 * Semua fungsi baca dan tulis data ada di sini. Halaman tidak memanggil Firestore langsung.
 * Bentuk keluaran fungsi baca dipertahankan agar halaman tidak perlu diubah.
 *
 * All read and write functions live here. Pages never call Firestore directly.
 * Read function output shapes are preserved so pages need no changes.
 */
"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { terlambat, keTanggal } from "./waktu.js";

// Ubah Timestamp Firestore → Date supaya fungsi waktu.js tetap bisa dipakai / Convert Firestore Timestamp → Date so waktu.js helpers still work
function tsKeDate(nilai) {
  if (!nilai) return null;
  if (nilai instanceof Timestamp) return nilai.toDate();
  if (nilai instanceof Date) return nilai;
  return null;
}

// Ubah dokumen presensi Firestore ke bentuk yang dipakai halaman / Map a Firestore presensi doc to the shape pages expect
function petaPresensi(snap) {
  const d = snap.data();
  return {
    id: snap.id,
    karyawanId: d.karyawanId,
    tanggal: d.tanggal,
    jamMasuk: tsKeDate(d.jamMasuk),
    jamPulang: tsKeDate(d.jamPulang),
  };
}

// Ubah dokumen pengajuan_cuti Firestore ke bentuk yang dipakai halaman / Map a Firestore pengajuan_cuti doc to the shape pages expect
function petaCuti(snap, namaMap = {}) {
  const d = snap.data();
  return {
    id: snap.id,
    karyawanId: d.karyawanId,
    nama: namaMap[d.karyawanId] ?? d.karyawanId,
    tanggalMulai: tsKeDate(d.tanggalMulai),
    tanggalSelesai: tsKeDate(d.tanggalSelesai),
    alasan: d.alasan,
    status: d.status,
    catatanHrd: d.catatanHrd ?? "",
    diajukanPada: tsKeDate(d.diajukanPada),
  };
}

// ─── BACA ────────────────────────────────────────────────────────────────────

// bulan berformat "2026-09" / bulan is formatted "2026-09"
export async function ambilPresensi(karyawanId, bulan) {
  const awal = bulan + "-01";
  const akhir = bulan + "-32"; // tanggal terbesar di semua bulan / largest possible date in any month
  const q = query(
    collection(db, "presensi"),
    where("karyawanId", "==", karyawanId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map(petaPresensi)
    .filter((p) => p.tanggal >= awal && p.tanggal <= akhir)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

export async function ambilPresensiTanggal(karyawanId, tanggal) {
  const q = query(
    collection(db, "presensi"),
    where("karyawanId", "==", karyawanId),
    where("tanggal", "==", tanggal)
  );
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  return petaPresensi(snaps.docs[0]);
}

export async function ambilPengajuanCuti(karyawanId) {
  const q = query(
    collection(db, "pengajuan_cuti"),
    where("karyawanId", "==", karyawanId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => petaCuti(s))
    .sort((a, b) => (b.diajukanPada?.getTime() ?? 0) - (a.diajukanPada?.getTime() ?? 0));
}

// Hasil null berarti nomor tidak ada / null means the number does not exist
export async function ambilSatuPengajuan(id) {
  const snap = await getDoc(doc(db, "pengajuan_cuti", id));
  if (!snap.exists()) return null;
  const karyawanId = snap.data().karyawanId;
  const userSnap = await getDoc(doc(db, "users", karyawanId));
  const nama = userSnap.exists() ? userSnap.data().nama : karyawanId;
  return petaCuti(snap, { [karyawanId]: nama });
}

// status kosong atau "semua" = tanpa saringan / empty or "semua" status = no filter
export async function ambilSemuaPengajuan(status) {
  // Ambil semua nama karyawan dulu untuk digabung / Pre-fetch all employee names for joining
  const usersSnap = await getDocs(collection(db, "users"));
  const namaMap = {};
  usersSnap.docs.forEach((s) => {
    namaMap[s.id] = s.data().nama;
  });

  let q;
  if (!status || status === "semua") {
    q = collection(db, "pengajuan_cuti");
  } else {
    q = query(
      collection(db, "pengajuan_cuti"),
      where("status", "==", status)
    );
  }
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => petaCuti(s, namaMap))
    .sort((a, b) => (b.diajukanPada?.getTime() ?? 0) - (a.diajukanPada?.getTime() ?? 0));
}

export async function ambilSemuaKaryawan() {
  const snaps = await getDocs(collection(db, "users"));
  return snaps.docs
    .map((s) => ({ id: s.id, ...s.data() }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function ambilKaryawan(id) {
  const snap = await getDoc(doc(db, "users", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function ambilRingkasanDasbor(tanggal) {
  const [hadirSnap, cutiSnap, karyawanSnap] = await Promise.all([
    getDocs(query(collection(db, "presensi"), where("tanggal", "==", tanggal))),
    getDocs(query(collection(db, "pengajuan_cuti"), where("status", "==", "menunggu"))),
    getCountFromServer(collection(db, "users")),
  ]);

  const hadirDocs = hadirSnap.docs.map(petaPresensi);
  return {
    hadir: hadirDocs.length,
    terlambat: hadirDocs.filter((p) => p.jamMasuk && terlambat(p.jamMasuk)).length,
    cutiMenunggu: cutiSnap.size,
    jumlahKaryawan: karyawanSnap.data().count,
  };
}

export async function ambilRekapBulanan(bulan) {
  const awal = bulan + "-01";
  const akhir = bulan + "-32";

  const [usersSnap, presensiSnap, cutiSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(
      query(
        collection(db, "presensi"),
        where("tanggal", ">=", awal),
        where("tanggal", "<=", akhir)
      )
    ),
    getDocs(
      query(collection(db, "pengajuan_cuti"), where("status", "==", "disetujui"))
    ),
  ]);

  const presensiDocs = presensiSnap.docs.map(petaPresensi);
  const cutiDocs = cutiSnap.docs.map((s) => petaCuti(s));

  return usersSnap.docs
    .map((s) => {
      const u = { id: s.id, ...s.data() };
      const hadirku = presensiDocs.filter((p) => p.karyawanId === u.id);
      let cutiDisetujui = 0;
      for (const c of cutiDocs) {
        if (c.karyawanId !== u.id) continue;
        for (
          let d = new Date(c.tanggalMulai);
          d <= c.tanggalSelesai;
          d.setDate(d.getDate() + 1)
        ) {
          if (keTanggal(d).startsWith(bulan)) cutiDisetujui++;
        }
      }
      return {
        karyawanId: u.id,
        nama: u.nama,
        hariHadir: hadirku.length,
        terlambat: hadirku.filter((p) => p.jamMasuk && terlambat(p.jamMasuk)).length,
        cutiDisetujui,
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

// ─── TULIS ───────────────────────────────────────────────────────────────────

// ID dokumen presensi: "{karyawanId}-{tanggal}" agar unik per orang per hari / Doc ID: "{karyawanId}-{tanggal}" — unique per person per day
export async function simpanPresensiMasuk(karyawanId) {
  const tanggal = keTanggal(new Date());
  const q = query(
    collection(db, "presensi"),
    where("karyawanId", "==", karyawanId),
    where("tanggal", "==", tanggal)
  );
  const snaps = await getDocs(q);
  if (!snaps.empty) {
    const docRef = snaps.docs[0].ref;
    await updateDoc(docRef, { jamMasuk: Timestamp.now() });
  } else {
    const id = `${karyawanId}-${tanggal}`;
    await setDoc(
      doc(db, "presensi", id),
      { karyawanId, tanggal, jamMasuk: Timestamp.now(), jamPulang: null },
      { merge: true }
    );
  }
  return tanggal;
}

export async function simpanPresensiPulang(karyawanId) {
  const tanggal = keTanggal(new Date());
  const q = query(
    collection(db, "presensi"),
    where("karyawanId", "==", karyawanId),
    where("tanggal", "==", tanggal)
  );
  const snaps = await getDocs(q);
  if (!snaps.empty) {
    const docRef = snaps.docs[0].ref;
    await updateDoc(docRef, { jamPulang: Timestamp.now() });
  } else {
    const id = `${karyawanId}-${tanggal}`;
    await setDoc(
      doc(db, "presensi", id),
      { karyawanId, tanggal, jamPulang: Timestamp.now() },
      { merge: true }
    );
  }
}

// Simpan pengajuan cuti baru; id dokumen dibuat otomatis / Save a new leave request; document id is auto-generated
export async function simpanPengajuanCuti(karyawanId, { tanggalMulai, tanggalSelesai, alasan }) {
  await addDoc(collection(db, "pengajuan_cuti"), {
    karyawanId,
    tanggalMulai: Timestamp.fromDate(new Date(tanggalMulai + "T00:00:00")),
    tanggalSelesai: Timestamp.fromDate(new Date(tanggalSelesai + "T00:00:00")),
    alasan,
    status: "menunggu",
    catatanHrd: "",
    diajukanPada: Timestamp.now(),
  });
}

// HRD menyetujui atau menolak cuti / HRD approves or rejects a leave request
export async function putuskanCuti(id, statusBaru, catatanHrd) {
  await updateDoc(doc(db, "pengajuan_cuti", id), {
    status: statusBaru,
    catatanHrd: catatanHrd ?? "",
  });
}

// Karyawan mengubah namanya sendiri / Employee updates their own display name
export async function simpanNamaProfil(uid, nama) {
  await updateDoc(doc(db, "users", uid), { nama });
}

// HRD mengubah peran karyawan lain / HRD changes another employee's role
export async function simpanPeranKaryawan(id, role) {
  await updateDoc(doc(db, "users", id), { role });
}
