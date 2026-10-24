import { createContext, useContext } from "react";

// provided by ClientLayout so any page header can open the client sidebar
export const SidebarContext = createContext({ isOpen: false, openSidebar: () => {} });

export const useSidebar = () => useContext(SidebarContext);
