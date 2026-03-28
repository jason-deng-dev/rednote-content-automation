"use client";
import Link from 'next/link';

const links = [
  { href: '/',        label: 'HOME' },
  { href: '/xhs',     label: 'XHS' },
  { href: '/rakuten', label: 'RAKUTEN' },
  { href: '/scraper', label: 'SCRAPER' },
];

export default function SideNav() {
  return (
    <nav className="w-48 h-full flex flex-col shrink-0" style={{backgroundColor: '#111111', borderRight: '1px solid #2A2A2A'}}>
      <div className="px-6 py-6" style={{borderBottom: '1px solid #2A2A2A'}}>
        <span className="text-xs font-medium tracking-wide uppercase" style={{color: '#888888'}}>
          Dashboard
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3 flex-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 text-xs font-medium tracking-wide transition-colors"
            style={{color: '#888888'}}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#EDEDED'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#888888'; }}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
