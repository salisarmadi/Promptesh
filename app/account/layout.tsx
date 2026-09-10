import { SiteChrome } from "@/app/_components/website/SiteChrome";

export default function AccountLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return <SiteChrome>{children}{modal}</SiteChrome>;
}
