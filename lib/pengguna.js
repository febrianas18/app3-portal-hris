/**
 * usePengguna() — Sesi 6: diganti dengan data nyata dari Firebase Auth dan dokumen users/{uid}.
 * Menggunakan singleton subscriber agar semua komponen berbagi status auth yang sama
 * dan pengguna langsung tersedia saat komponen dibuka tanpa flicker null.
 *
 * usePengguna() — Session 6: replaced with real data from Firebase Auth and users/{uid} document.
 * Uses a singleton subscriber so all components share the same auth state without null flicker.
 */
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

const KUNCI_SESI = "sedap_sesi_aktif";

/**
 * Tandai bahwa sesi sedang aktif di peramban saat pengguna sengaja masuk.
 * Tersimpan di sessionStorage sehingga otomatis hilang saat tab/jendela peramban ditutup.
 */
export function catatSesiMasuk() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(KUNCI_SESI, "1");
    } catch (_) {}
  }
}

/**
 * Hapus penanda sesi aktif (saat logout).
 */
export function hapusSesiMasuk() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(KUNCI_SESI);
    } catch (_) {}
  }
}

/**
 * Periksa apakah sesi saat ini sah dan aktif dalam sesi peramban berjalan.
 */
export function adaSesiAktif() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(KUNCI_SESI) === "1";
  } catch (_) {
    return false;
  }
}

let keadaanGlobal = { pengguna: null, memuat: true };
const pelanggan = new Set();
let langgananDimulai = false;
let batalDocGlobal = null;

function beritahuPelanggan() {
  pelanggan.forEach((fn) => fn({ ...keadaanGlobal }));
}

function mulaiLanggananAuth() {
  if (langgananDimulai) return;
  langgananDimulai = true;

  onAuthStateChanged(auth, async (userAuth) => {
    if (batalDocGlobal) {
      batalDocGlobal();
      batalDocGlobal = null;
    }
    if (!userAuth) {
      keadaanGlobal = { pengguna: null, memuat: false };
      beritahuPelanggan();
      return;
    }

    // Jika peramban atau tab baru dibuka tanpa sesi aktif (misal sisa token IndexedDB lama),
    // putuskan sesi lama demi keamanan agar pengguna tidak langsung diarahkan ke Admin tanpa login
    if (!adaSesiAktif()) {
      try {
        await signOut(auth);
      } catch (_) {}
      keadaanGlobal = { pengguna: null, memuat: false };
      beritahuPelanggan();
      return;
    }
    batalDocGlobal = onSnapshot(
      doc(db, "users", userAuth.uid),
      (snap) => {
        if (snap.exists()) {
          keadaanGlobal = {
            pengguna: { uid: userAuth.uid, ...snap.data() },
            memuat: false,
          };
        } else {
          keadaanGlobal = { pengguna: null, memuat: false };
        }
        beritahuPelanggan();
      },
      () => {
        keadaanGlobal = { pengguna: null, memuat: false };
        beritahuPelanggan();
      }
    );
  });
}

export function usePengguna() {
  // Langsung mulai langganan saat modul pertama kali dipakai
  if (typeof window !== "undefined") {
    mulaiLanggananAuth();
  }

  const [state, setState] = useState(() => ({ ...keadaanGlobal }));

  useEffect(() => {
    pelanggan.add(setState);
    setState({ ...keadaanGlobal });
    return () => {
      pelanggan.delete(setState);
    };
  }, []);

  return state;
}
