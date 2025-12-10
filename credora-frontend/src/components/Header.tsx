import { Link } from 'react-router-dom';
import { WalletButton } from './WalletButton';
import { MobileMenu } from './MobileMenu';
import { NotificationCenter } from './NotificationCenter';
import { TrendingUp } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="relative">
            <TrendingUp className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/40 transition-colors rounded-full" />
          </div>
          <span className="text-2xl font-bold gradient-text">
            Credora
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors relative group"
          >
            Dashboard
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
          </Link>
          <Link
            to="/lending"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors relative group"
          >
            Lending Pool
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
          </Link>
          <Link
            to="/borrow"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors relative group"
          >
            Borrow
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
          </Link>
          <Link
            to="/activity"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors relative group"
          >
            My Activity
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
          </Link>
          <Link
            to="/admin"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors relative group"
          >
            Admin
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <WalletButton />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
