import { Footer, FooterCopyright } from "flowbite-react";

export const AppFooter = () => {
  return (
    <Footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <FooterCopyright href="#" by="Jakub Buriánek" year={2025} />
    </Footer>
  );
};
