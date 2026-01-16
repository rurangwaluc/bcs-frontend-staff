import Link from "next/link";
import RoleBar from "../../components/RoleBar";

export default function ManagerPage() {
  return (
    <div>
      <RoleBar title="Manager" subtitle="Page not built yet (later)" />
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="font-semibold">Coming later</div>
          <p className="text-sm text-gray-600 mt-2">
            Approve/cancel sales, approve credits, view reports (no cash handling).
          </p>
          <Link className="inline-block mt-4 underline" href="/">Back</Link>
        </div>
      </div>
    </div>
  );
}
