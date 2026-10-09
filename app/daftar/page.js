"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { usePengguna, catatSesiMasuk, hapusSesiMasuk } from "@/lib/pengguna";
import KerangkaPublik from "@/components/KerangkaPublik";
import Memuat from "@/components/Memuat";

// Buat dokumen profil jika belum ada, lalu arahkan sesuai peran (PRD 4.1) / Create profile if missing and route by role
async function buatProfilDanArahkan(user, router, tujuanKembali) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  let role = "karyawan";
  if (!snap.exists()) {
    await setDoc(ref, {
      nama: user.displayName ?? user.email.split("@")[0],
      email: user.email,
      role: "karyawan",
    });
  } else {
    role = snap.data().role || "karyawan";
  }

  let tujuan = role === "hrd" ? "/admin" : "/beranda";
  if (tujuanKembali && tujuanKembali.startsWith("/") && !tujuanKembali.startsWith("//")) {
    if (!tujuanKembali.startsWith("/admin") || role === "hrd") {
      tujuan = tujuanKembali;
    }
  }
  router.push(tujuan);
}

function pesanGalat(kode) {
  switch (kode) {
    case "auth/email-already-in-use":
      return "Email sudah terdaftar. Coba masuk dengan email ini.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/weak-password":
      return "Kata sandi terlalu lemah. Minimal 6 karakter.";
    case "auth/popup-closed-by-user":
      return "Jendela Google ditutup sebelum selesai.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}

function IsiHalamanDaftar() {
  const { pengguna, memuat: memuatPengguna } = usePengguna();
  const searchParams = useSearchParams();
  const tujuanKembali = searchParams.get("kembali");

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [galat, setGalat] = useState({});
  const [memuat, setMemuat] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const router = useRouter();

  // Pengguna yang sudah masuk langsung dialihkan ke halamannya (PRD 4.1), hanya jika tidak sedang dalam proses klik tombol
  useEffect(() => {
    if (!memuatPengguna && pengguna && !memuat) {
      let tujuan = pengguna.role === "hrd" ? "/admin" : "/beranda";
      if (tujuanKembali && tujuanKembali.startsWith("/") && !tujuanKembali.startsWith("//")) {
        if (!tujuanKembali.startsWith("/admin") || pengguna.role === "hrd") {
          tujuan = tujuanKembali;
        }
      }
      router.replace(tujuan);
    }
  }, [pengguna, memuatPengguna, memuat, tujuanKembali, router]);

  if (memuatPengguna) return <Memuat />;

  async function kirim(e) {
    e.preventDefault();
    const g = {};
    if (!nama.trim()) g.nama = "Nama wajib diisi.";
    if (!email.trim()) g.email = "Email wajib diisi.";
    if (kataSandi.length < 6) g.kataSandi = "Kata sandi minimal 6 karakter.";
    setGalat(g);
    if (Object.keys(g).length > 0) { setPesanError(""); return; }

    setMemuat(true);
    setPesanError("");
    catatSesiMasuk();
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, kataSandi);
      // Buat dokumen profil di Firestore / Create profile document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        nama: nama.trim(),
        email,
        role: "karyawan",
      });
      let tujuan = "/beranda";
      if (tujuanKembali && tujuanKembali.startsWith("/") && !tujuanKembali.startsWith("//") && !tujuanKembali.startsWith("/admin")) {
        tujuan = tujuanKembali;
      }
      router.push(tujuan);
    } catch (err) {
      hapusSesiMasuk();
      setPesanError(pesanGalat(err.code));
      setMemuat(false);
    }
  }

  async function masukGoogle() {
    if (memuat) return;
    setMemuat(true);
    setPesanError("");
    catatSesiMasuk();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      if (cred?.user) {
        await buatProfilDanArahkan(cred.user, router, tujuanKembali);
      }
    } catch (err) {
      const pesan = err?.message || "";
      if (auth.currentUser) {
        await buatProfilDanArahkan(auth.currentUser, router, tujuanKembali);
        return;
      }
      hapusSesiMasuk();
      if (
        err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request" &&
        !pesan.includes("Pending promise was never set")
      ) {
        setPesanError(pesanGalat(err.code));
      }
      setMemuat(false);
    }
  }

  return (
    <KerangkaPublik judul="Daftar">
      <form onSubmit={kirim} noValidate className="space-y-4">
        <div>
          <label htmlFor="nama" className="label">Nama lengkap</label>
          <input
            id="nama"
            type="text"
            autoComplete="name"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="isian"
            disabled={memuat}
          />
          {galat.nama && <p className="galat">{galat.nama}</p>}
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="isian"
            disabled={memuat}
          />
          {galat.email && <p className="galat">{galat.email}</p>}
        </div>
        <div>
          <label htmlFor="kataSandi" className="label">Kata sandi</label>
          <input
            id="kataSandi"
            type="password"
            autoComplete="new-password"
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            className="isian"
            disabled={memuat}
          />
          {galat.kataSandi && <p className="galat">{galat.kataSandi}</p>}
        </div>
        <button type="submit" disabled={memuat} className="tombol-utama w-full py-3 text-lg">
          {memuat ? "Mendaftar…" : "Daftar"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm font-bold text-redup">
        <span className="h-0.5 flex-1 bg-tinta/15" />
        atau
        <span className="h-0.5 flex-1 bg-tinta/15" />
      </div>

      <button type="button" onClick={masukGoogle} disabled={memuat} className="tombol-kedua w-full py-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-kunyit text-sm font-bold text-tinta">G</span>
        Daftar dengan Google
      </button>

      {pesanError && (
        <p role="alert" className="mt-5 rounded-xl border border-ditolak/30 bg-ditolak/10 p-3 text-sm font-bold text-red-700">
          {pesanError}
        </p>
      )}

      <p className="mt-6 text-center text-sm font-medium text-redup">
        Sudah punya akun?{" "}
        <Link
          href={tujuanKembali ? `/masuk?kembali=${encodeURIComponent(tujuanKembali)}` : "/masuk"}
          className="font-semibold text-sedap hover:underline"
        >
          Masuk
        </Link>
      </p>
    </KerangkaPublik>
  );
}

export default function HalamanDaftar() {
  return (
    <Suspense fallback={<Memuat />}>
      <IsiHalamanDaftar />
    </Suspense>
  );
}
