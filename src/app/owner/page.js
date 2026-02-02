import { redirect } from "next/navigation";

export default function OwnerDisabledPage() {
  // Owner portal is a separate application by design.
  // If you set NEXT_PUBLIC_OWNER_APP_URL (e.g. https://owner.yourdomain.com),
  // staff users will be redirected there.
  const ownerUrl = process.env.NEXT_PUBLIC_OWNER_APP_URL;

  if (ownerUrl && typeof ownerUrl === "string" && ownerUrl.trim()) {
    redirect(ownerUrl);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white border rounded-2xl p-6">
        <h1 className="text-lg font-semibold">Owner Portal</h1>
        <p className="mt-2 text-sm text-gray-700">
          The Owner Portal is a separate application (for business oversight).
          This staff app is for daily operations only.
        </p>

        <div className="mt-4 text-sm text-gray-700 space-y-2">
          <p className="font-medium">To enable automatic redirect:</p>
          <pre className="bg-gray-100 rounded-lg p-3 overflow-auto text-xs">
            NEXT_PUBLIC_OWNER_APP_URL=https://owner.yourdomain.com
          </pre>
        </div>
      </div>
    </div>
  );
}
