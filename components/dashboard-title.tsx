import Link from "next/link";

export default function DashboardTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: { href: string; label: string } }) {
  return (
    <header className="workspace-page-heading">
      <div><p className="workspace-eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      {action && <Link className="button button-dark" href={action.href}>{action.label} <span aria-hidden="true">→</span></Link>}
    </header>
  );
}
