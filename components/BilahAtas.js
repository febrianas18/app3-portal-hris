"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePengguna, hapusSesiMasuk } from "@/lib/pengguna";

export default function BilahAtas() {
  const { pengguna } = usePengguna();
  const router = useRouter();

  async function keluar() {
    hapusSesiMasuk();
    await signOut(auth);
    router.replace("/masuk");
  }

  return (
    <header className="flex items-center justify-between gap-4 bg-sedap px-4 py-3 text-white md:px-6">
      <Link
        href={pengguna?.role === "hrd" ? "/admin" : "/beranda"}
        className="flex items-center gap-2.5"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-tinta/10 bg-kunyit text-lg font-bold text-tinta shadow-tipis">
          S
        </span>
        <span className="text-xl font-bold tracking-tight">Portal HRIS</span>
      </Link>
      {pengguna && (
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-bold">{pengguna.nama}</div>
            <div className="text-xs font-semibold text-kunyit">
              {pengguna.role === "hrd" ? "HRD" : "Karyawan"}
            </div>
          </div>
          {/* Inisial nama sebagai avatar / Name initial as the avatar */}
          <span className="grid h-10 w-10 place-items-center rounded-full border border-tinta/10 bg-krem font-bold text-tinta">
            {(pengguna.nama || "").charAt(0) || "U"}
          </span>
          <button
            type="button"
            onClick={keluar}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Keluar
          </button>
        </div>
      )}
    </header>
  );
}

