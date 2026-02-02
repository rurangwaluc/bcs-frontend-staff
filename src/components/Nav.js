import Link from "next/link";

export default function Nav({
  title = "BCS Admin",
  active = "",
  right = null,
  items = [
    { href: "/", label: "Dashboard", key: "home" },
    { href: "/staff", label: "Staff", key: "staff" },
    { href: "/sales", label: "Sales", key: "sales" },
    { href: "/credits", label: "Credits", key: "credits" },
    { href: "/cash", label: "Cash", key: "cash" },
    { href: "/audit", label: "Audit", key: "audit" },
    { href: "/customers", label: "Customers", key: "customers" },
    { href: "/inventory", label: "Inventory", key: "inventory" },
  ],
}) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="font-bold">{title}</div>

        <nav className="flex gap-3 text-sm">
          {items.map((it) => (
            <Link
              key={it.key || it.href}
              href={it.href}
              className={
                "px-3 py-1.5 rounded-lg " +
                (active === it.key
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100")
              }
            >
              {it.label}
            </Link>
          ))}
        </nav>

        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
