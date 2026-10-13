import { browser } from 'wxt/browser';

// Firefox's sidebar, where the side panel opens. @wxt-dev/browser's types come from Chrome, which has
// a sidePanel API instead, so they leave it out. open() and close() work only in a click handler.
type SidebarAction = {
  open(): Promise<void>;
  close(): Promise<void>;
  isOpen(details: { windowId?: number }): Promise<boolean>;
};

export const sidebar = (browser as unknown as { sidebarAction: SidebarAction }).sidebarAction;
