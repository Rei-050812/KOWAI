import { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: {
    default: "管理画面",
    template: "%s | 管理画面 | KOWAI",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
