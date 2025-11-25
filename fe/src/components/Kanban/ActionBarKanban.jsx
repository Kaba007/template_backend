import { Sidebar, SidebarItemGroup, SidebarItems, Tooltip } from 'flowbite-react';

export const ActionBarKanban = ({ selectedItem, actions = [] }) => {
  const hasSelection = !!selectedItem;

  return (
    <Sidebar aria-label="Akční panel" className="w-16">
      <SidebarItems>
        <SidebarItemGroup>
          {/* Vertikální offset + Nadpis */}
          <div className="pt-13">
            <div className="px-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                Rychlé akce
              </h3>
            </div>

            {/* Akce */}
            {actions.map((action, index) => (
              <Tooltip
                key={index}
                content={hasSelection ? action.label : 'Vyberte kartu'}
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
                    {action.icon && <action.icon className="w-7 h-7" />}
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
