import { Suspense } from "react";
import BilahAtas from "@/components/BilahAtas";
import MenuSamping from "@/components/MenuSamping";
import Memuat from "@/components/Memuat";
import RouteGuard from "@/components/RouteGuard";

/**
 * Tata letak semua halaman setelah masuk. Halaman /masuk dan /daftar ada di luar
 * folder (aplikasi), jadi tampil tanpa bilah atas dan menu.
 * Suspense wajib karena menu dan halaman membaca alamat (usePathname, useSearchParams).
 *
 * Layout for every signed-in page. /masuk and /daftar live outside the (aplikasi)
 * folder, so they render without the top bar and menu.
 * Suspense is required because the menu and pages read the URL (usePathname, useSearchParams).
 */
export default function LayoutAplikasi({ children }) {
  return (
    <Suspense fallback={<Memuat />}>
      <RouteGuard>
        <div className="flex min-h-screen flex-col">
          <BilahAtas />
          <div className="flex flex-1 flex-col md:flex-row">
            <aside className="bg-tinta md:w-64 md:shrink-0">
              <Suspense>
                <MenuSamping />
              </Suspense>
            </aside>
            <main className="min-w-0 flex-1 p-4 md:p-8">
              <div className="mx-auto max-w-5xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </RouteGuard>
    </Suspense>
  );
}
