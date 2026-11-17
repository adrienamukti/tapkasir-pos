
import { Suspense } from "react";
import CustomerPage from "./components/CustomerPage";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          className="tk-simple-loading"
          role="status"
          aria-label="Memuat halaman"
        >
          <div className="tk-simple-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      }
    >
      <CustomerPage />
    </Suspense>
  );
}
