"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { btn, Modal } from "@/components/ui";
import {cn} from "@/lib/utils"

export function BarcodeSvg({
  value,
  height = 64,
  barWidth = 2,
  className,
  style,
}: {
  value: string;
  height?: number;
  barWidth?: number; // giảm xuống ~1.3 khi in khổ hẹp 80mm để không tràn giấy
  className?: string;
  style?: React.CSSProperties; // style inline sống sót khi copy innerHTML sang cửa sổ in
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current)
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width: barWidth,
        fontSize: 13,
        margin: 8,
        displayValue: true,
      });
  }, [value, height, barWidth]);
  return <svg ref={ref} className={cn("max-w-full", className)} style={style} />;
}

// Modal xem + in barcode (tem khuyến mãi PM…, thẻ thành viên TLX…)
export function BarcodeModal({
  title,
  subtitle,
  value,
  onClose,
}: {
  title: string;
  subtitle: string;
  value: string;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted">{subtitle}</p>
        <div ref={boxRef} className="flex justify-center rounded-xl border border-line bg-white p-4">
          <BarcodeSvg value={value} />
        </div>
        <button
          className={`${btn.primary} w-full`}
          onClick={() => printBarcode(title, subtitle, boxRef.current?.innerHTML ?? "")}
        >
          <Printer size={16} /> In {title.toLowerCase().includes("thẻ") ? "thẻ" : "tem"}
        </button>
      </div>
    </Modal>
  );
}

// In tem/thẻ: mở cửa sổ mới chỉ chứa nội dung cần in
export function printBarcode(title: string, subtitle: string, svgHtml: string) {
  const w = window.open("", "_blank", "width=420,height=320");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; }
    .card { border: 1px solid #ccc; border-radius: 12px; padding: 20px 28px; text-align: center; }
    .title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 8px; }
  </style></head><body onload="print();close()">
    <div class="card"><div class="title">${title}</div><div class="sub">${subtitle}</div>${svgHtml}</div>
  </body></html>`);
  w.document.close();
}
