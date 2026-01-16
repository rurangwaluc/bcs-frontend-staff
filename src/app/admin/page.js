import Link from "next/link";
import RoleBar from "../../components/RoleBar";

export default function StaffAdminPage() {
  return (
    <div>
      <RoleBar title="Admin (Staff App)" subtitle="Optional access (mostly use Admin dashboard)" />
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="font-semibold">Use Admin dashboard</div>
          <p className="text-sm text-gray-600 mt-2">
            Operational work should be done by staff roles. Admin controls via the Admin app.
          </p>
          <Link className="inline-block mt-4 underline" href="/">Back</Link>
        </div>
      </div>
    </div>
  );
}
