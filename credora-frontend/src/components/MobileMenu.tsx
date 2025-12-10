import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Home, Wallet, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/lending', label: 'Lending Pool', icon: TrendingUp },
    { to: '/borrow', label: 'Borrow', icon: Wallet },
    { to: '/activity', label: 'My Activity', icon: Activity },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 glass">
        <SheetHeader>
          <SheetTitle className="text-left">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span className="gradient-text">Credora</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 mt-8">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
