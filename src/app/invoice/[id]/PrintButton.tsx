"use client";
import { Printer } from "lucide-react";
export default function PrintButton() {
  return <button className="btn" onClick={() => window.print()}><Printer size={16} />In / Lưu PDF</button>;
}
