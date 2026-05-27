import Link from 'next/link';
import { Disc3, Mail } from 'lucide-react';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4H16V5.3c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.3V11H8.8v2.8H11V21h2.5Z" />
    </svg>
  );
}

const socialLinks = [
  { href: '#', label: 'Facebook', icon: FacebookIcon },
  { href: '#', label: 'Email', icon: Mail },
  { href: '#', label: 'Discord', icon: Disc3 },
];

const footerLinks = [
  { href: '#', label: 'Privacy' },
  { href: '#', label: 'Terms' },
  { href: '#', label: 'Contact' },
];

export function SiteFooter({ backgroundImage }: { backgroundImage?: string | null }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10 overflow-hidden border-t border-white/[0.05] text-white">
      <div className="pointer-events-none absolute inset-0">
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-32"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(139,92,246,0.1),transparent_30%),radial-gradient(circle_at_82%_26%,rgba(255,255,255,0.04),transparent_22%),linear-gradient(180deg,rgba(6,8,14,0.42),rgba(6,8,14,0.62))]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute -right-12 top-0 h-[120%] w-[42%] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_62%)] blur-3xl" />
      </div>

      <div className="relative px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="max-w-[1080px]">
          <div className="space-y-5">
            <img
              src="/anivault-logo.png"
              alt="AniVault"
              className="h-auto w-[168px] object-contain sm:w-[200px]"
            />

            <p className="max-w-[760px] text-[1.02rem] leading-8 text-white/64">
              Your ultimate destination for anime streaming, discussions, and community. Discover,
              watch, and connect with fellow anime enthusiasts.
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-3 text-[1.02rem] text-white/78">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-6 pt-1 text-white/82">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="transition-colors hover:text-white"
                >
                  <Icon className="h-5 w-5" />
                </Link>
              ))}
            </div>

            <div className="space-y-2 pt-4 text-white/46">
              <p className="text-[1rem]">Copyright &copy; {year} AniVault. All Rights Reserved</p>
              <p className="max-w-[840px] text-[0.98rem] leading-8">
                This site does not store any files on its server. All contents are provided by
                non-affiliated third parties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
