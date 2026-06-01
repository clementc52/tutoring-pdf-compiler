import Link from "next/link";

export default function PortalButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        inline-flex
        items-center
        justify-center
        border
        border-white/10
        bg-white/[0.02]
        px-7
        py-4
        text-sm
        uppercase
        tracking-[0.22em]
        text-white/75
        transition-all
        duration-200
        hover:border-white/30
        hover:bg-white/[0.05]
        hover:text-white
      "
    >
      {children}
    </Link>
  );
}