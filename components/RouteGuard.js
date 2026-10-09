"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import Memuat from "@/components/Memuat";

/**
 * RouteGuard — penjaga semua halaman (aplikasi):
 * /beranda, /presensi, /cuti, /profil, dan halaman turunannya.
 * Karyawan dan HRD boleh membuka halaman ini.
 * Pengguna yang belum masuk diarahkan ke /masuk?kembali=<alamat asal>.
 */
export default function RouteGuard({ children }) {
  const { pengguna, memuat } = usePengguna();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!memuat && !pengguna) {
      const query = searchParams ? searchParams.toString() : "";
      const alamatAsal = query ? `${pathname}?${query}` : pathname;
      const kembaliParam = alamatAsal ? `?kembali=${encodeURIComponent(alamatAsal)}` : "";
      router.replace(`/masuk${kembaliParam}`);
    }
  }, [pengguna, memuat, pathname, searchParams, router]);

  if (memuat) return <Memuat />;
  if (!pengguna) return <Memuat />; // Tampil sebentar sampai redirect selesai / Briefly shown while redirect runs
  return children;
}
