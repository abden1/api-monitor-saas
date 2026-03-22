import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="p-6">
        <Link href="/" className="flex items-center w-fit">
          <Image src="/logo.png" alt="API Monitor" width={130} height={44} className="object-contain" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
