"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { usePengguna, catatSesiMasuk, hapusSesiMasuk } from "@/lib/pengguna";
import KerangkaPublik from "@/components/KerangkaPublik";
import Memuat from "@/components/Memuat";

// Pesan galat Firebase → kalimat Indonesia yang ramah pengguna / Firebase error codes → friendly Indonesian messages
function pesanGalat(kode) {
  switch (kode) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email atau kata sandi salah.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa menit.";
    case "auth/user-disabled":
      return "Akun ini dinonaktifkan. Hubungi HRD.";
    case "auth/popup-closed-by-user":
      return "Jendela Google ditutup sebelum selesai.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}

// Pastikan dokumen profil ada di users/{uid} dan baca perannya / Ensure users/{uid} doc exists and return its role
async function pastikanProfilDanArahkan(user, router, tujuanKembali) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  let role = "karyawan";
  if (!snap.exists()) {
    // Pengguna Google baru yang pertama kali masuk lewat /masuk (PRD 4.1)
    const nama = user.displayName || user.email.split("@")[0];
    await setDoc(ref, {
      nama,
      email: user.email,
      role: "karyawan",
    });
  } else {
    role = snap.data().role || "karyawan";
  }

  // Arahkan ke alamat tujuan kembali jika ada, atau default sesuai peran
  let tujuan = role === "hrd" ? "/admin" : "/beranda";
  if (tujuanKembali && tujuanKembali.startsWith("/") && !tujuanKembali.startsWith("//")) {
    if (!tujuanKembali.startsWith("/admin") || role === "hrd") {
      tujuan = tujuanKembali;
    }
  }
  router.push(tujuan);
}

function IsiHalamanMasuk() {
  const { pengguna, memuat: memuatPengguna } = usePengguna();
  const searchParams = useSearchParams();
  const tujuanKembali = searchParams.get("kembali");

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
    if (!email.trim()) g.email = "Email wajib diisi.";
    if (kataSandi.length < 6) g.kataSandi = "Kata sandi minimal 6 karakter.";
    setGalat(g);
    if (Object.keys(g).length > 0) { setPesanError(""); return; }

    setMemuat(true);
    setPesanError("");
    catatSesiMasuk();
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, kataSandi);
      await pastikanProfilDanArahkan(user, router, tujuanKembali);
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
        await pastikanProfilDanArahkan(cred.user, router, tujuanKembali);
      }
    } catch (err) {
      const pesan = err?.message || "";
      // Jika terjadi assertion timeout / popup race condition tapi kredensial sebenarnya berhasil
      if (auth.currentUser) {
        await pastikanProfilDanArahkan(auth.currentUser, router, tujuanKembali);
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
    <KerangkaPublik judul="Masuk">
      <form onSubmit={kirim} noValidate className="space-y-4">
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
            autoComplete="current-password"
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            className="isian"
            disabled={memuat}
          />
          {galat.kataSandi && <p className="galat">{galat.kataSandi}</p>}
        </div>
        <button type="submit" disabled={memuat} className="tombol-utama w-full py-3 text-lg">
          {memuat ? "Masuk…" : "Masuk"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm font-bold text-redup">
        <span className="h-0.5 flex-1 bg-tinta/15" />
        atau
        <span className="h-0.5 flex-1 bg-tinta/15" />
      </div>

      <button type="button" onClick={masukGoogle} disabled={memuat} className="tombol-kedua w-full py-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-kunyit text-sm font-bold text-tinta">G</span>
        Masuk dengan Google
      </button>

      {pesanError && (
        <p role="alert" className="mt-5 rounded-xl border border-ditolak/30 bg-ditolak/10 p-3 text-sm font-bold text-red-700">
          {pesanError}
        </p>
      )}

      <p className="mt-6 text-center text-sm font-medium text-redup">
        Belum punya akun?{" "}
        <Link
          href={tujuanKembali ? `/daftar?kembali=${encodeURIComponent(tujuanKembali)}` : "/daftar"}
          className="font-semibold text-sedap hover:underline"
        >
          Daftar
        </Link>
      </p>
    </KerangkaPublik>
  );
}

export default function HalamanMasuk() {
  return (
    <Suspense fallback={<Memuat />}>
      <IsiHalamanMasuk />
    </Suspense>
  );
}
