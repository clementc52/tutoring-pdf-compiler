type AlertItem = {
  type: "danger" | "success" | "neutral";
  title: string;
  detail: string;
};

export default function StudentAlertRail({
  alerts,
}: {
  alerts: AlertItem[];
}) {
  if (alerts.length === 0) return null;

  return (
    <aside className="absolute right-8 top-44 w-[260px] space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className="relative border border-white/10 bg-[#080808]/70 p-4 backdrop-blur-sm"
        >
          <span
            className={[
              "absolute left-3 top-3 h-1.5 w-1.5 rounded-full",
              alert.type === "danger"
                ? "bg-red-500"
                : alert.type === "success"
                ? "bg-green-500"
                : "bg-white/40",
            ].join(" ")}
          />

          <p className="pl-4 text-[11px] uppercase tracking-[0.28em] text-[#888]">
            {alert.title}
          </p>

          <p className="mt-3 pl-4 text-[13px] leading-6 text-[#cfcfcf]">
            {alert.detail}
          </p>
        </div>
      ))}
    </aside>
  );
}