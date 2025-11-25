import { Sidebar, SidebarItemGroup, SidebarItems, Tooltip } from 'flowbite-react';

export const ActionBar = ({ selectedItem, actions = [] }) => {
  const hasSelection = !!selectedItem;

  return (
    <Sidebar aria-label="Akční panel" className="w-16">
      <SidebarItems>
        <SidebarItemGroup>
          {/* Vertikální offset aby ikony byly na úrovni tabulky */}
          <div className="pt-32">
            {actions.map((action, index) => (
              <Tooltip
                key={index}
                content={hasSelection ? action.label : 'Vyberte záznam'}
                placement="left"
              >
                <div className="flex justify-center mb-2">
                  <button
                    disabled={!hasSelection}
                    onClick={() => hasSelection && action.onClick(selectedItem)}
                    className={`
                      flex items-center justify-center w-12 h-12
                      rounded-lg transition-colors
                      ${hasSelection
                        ? 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
                        : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }
                    `}
                  >
                    {action.icon && <action.icon className="w-10 h-10" />}
                  </button>
                </div>
              </Tooltip>
            ))}
          </div>
        </SidebarItemGroup>
      </SidebarItems>
    </Sidebar>
  );
};
