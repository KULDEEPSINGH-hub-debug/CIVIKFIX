import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Github, Twitter, Mail } from 'lucide-react'

const FOOTER_LINKS = {
  Platform: [
    { label: 'Explore Issues', to: '/explore' },
    { label: 'Report an Issue', to: '/report' },
    { label: 'Live Map', to: '/map' },
    { label: 'Find Authority', to: '/find-authority' },
  ],
  'For Citizens': [
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'Register', to: '/register' },
    { label: 'Login', to: '/login' },
    { label: 'Help & FAQ', to: '/help' },
  ],
  'For Authorities': [
    { label: 'Authority Login', to: '/authority/login' },
    { label: 'Apply for Access', to: '/authority/apply' },
    { label: 'Authority Directory', to: '/authority/directory' },
  ],
  Legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Disclaimer', to: '/disclaimer' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-navy text-white mt-16">
      <div className="container-app py-12">
        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">CivicFix</span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              An independent civic-tech platform helping citizens report problems, find the right
              authority, and track real progress.
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="#"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@civicfix.demo"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-white/90">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/10 pt-6 mb-4">
          <p className="text-xs text-white/50 leading-relaxed max-w-4xl">
            <strong className="text-white/70">Disclaimer:</strong> CivicFix is an independent
            civic-technology platform. It is not affiliated with, endorsed by, or officially
            connected to any government department, municipality, or public authority. CivicFix
            does not guarantee that any issue will be resolved. All department and authority
            information is provided for informational purposes only.
          </p>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} CivicFix. Made with ❤️ for Indian citizens.
          </p>
          <p className="text-xs text-white/50">
            Built with open-source technologies. Not for commercial use.
          </p>
        </div>
      </div>
    </footer>
  )
}
