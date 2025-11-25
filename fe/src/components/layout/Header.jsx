import { Navbar, NavbarBrand, NavbarCollapse, NavbarToggle } from "flowbite-react";

export const Header = () => {
  return (
    <Navbar
      fluid
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <NavbarBrand href="/">
        <img src="/favicon.svg" className="mr-3 h-6 sm:h-9" alt="Flowbite React Logo" />
        <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Pomocníček</span>
      </NavbarBrand>
      <NavbarToggle />
      <NavbarCollapse>
        {/* Zde můžeš přidat menu položky, pokud budeš chtít */}
      </NavbarCollapse>
    </Navbar>
  );
};
