import { Navbar, NavbarBrand } from "flowbite-react";

export const Header = () => {
  return (
    <Navbar
      fluid
      className="bg-gray-50 dark:bg-gray-800 border-b border-gray-50 dark:border-gray-700"
    >
      <NavbarBrand href="/">

        <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Pomocníček</span>
      </NavbarBrand>
    </Navbar>
  );
};
