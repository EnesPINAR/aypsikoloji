const Header = () => {
  return (
    <>
      <div className="w-full px-4 md:px-16 lg:px-24 py-4 flex justify-between bg-stone-100 dark:bg-neutral-950/98 dark:text-stone-100">
        <p className="">Ay Psikoloji</p>
        <ul className="grid gap-4 grid-cols-3">
          <li>
            <a href="/">Ana Sayfa</a>
          </li>
          <li>
            <a href="/randevu">Randevu</a>
          </li>
          <li>
            <a href="/hakkimda">Hakkımda</a>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Header;
