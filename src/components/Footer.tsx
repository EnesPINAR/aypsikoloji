export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} AyPsikoloji. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
