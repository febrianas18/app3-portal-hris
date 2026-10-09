"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePengguna } from "@/lib/pengguna";
import Memuat from "@/components/Memuat";
import AksesDitolak from "@/components/AksesDitolak";

/**
 * Semua halaman /admin/* dilindungi oleh layout ini.
 * Belum masuk → arahkan ke /masuk?kembali=<alamat asal>.
 * Sudah masuk tapi bukan HRD → tampilkan AksesDitolak.
 * HRD → tampilkan halaman.
 *
 * All /admin/* pages are guarded by this layout.
 * Not signed in → redirect to /masuk?kembali=<alamat asal>.
 * Signed in but not HRD → show AksesDitolak.
 * HRD → render the page.
 */
export default function LayoutAdmin({ children }) {
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
  if (!pengguna) return <Memuat />; // Sementara sampai redirect selesai / Briefly shown while redirect runs
  if (pengguna.role !== "hrd") return <AksesDitolak />;
  return children;
}
