export const appVersionLabel = "0.2";

export const networkEngineerPath = "/network-engineer";
export const networkEngineerChatPath = `${networkEngineerPath}/chat`;
export const networkPmAutomationPath = `${networkEngineerPath}/network-pm-automation`;
export const legacyExcelAutomationPath = `${networkEngineerPath}/excel-automation`;

export const siteNavItems = [
  {
    id: "home",
    label: "Home",
    href: "/",
    description: "返回 Dawn Workspace 首頁。",
  },
  {
    id: "blog",
    label: "Dawn Blog",
    href: "/blog",
    description: "筆記、觀察和長期整理。",
  },
  {
    id: "network-engineer",
    label: "Network Engineer",
    href: networkEngineerPath,
    description: "AI Chat、Network PM Automation 和網路工程工具。",
  },
  {
    id: "future",
    label: "以後再開發",
    href: "/future",
    description: "保留給下一階段的新方向。",
  },
] as const;

export type SiteNavId = (typeof siteNavItems)[number]["id"];

export const networkEngineerNavItems = [
  {
    id: "chat",
    label: "AI Chat",
    href: networkEngineerChatPath,
    description: "進入通用 AI Chat 工作區。",
  },
  {
    id: "network-pm-automation",
    label: "Network PM Automation",
    href: networkPmAutomationPath,
    description: "保留 Network PM 自動化入口，稍後接第一個流程。",
  },
  {
    id: "future",
    label: "以後再開發",
    href: "/network-engineer/future",
    description: "保留給後續網路工程工具。",
  },
] as const;

export type NetworkEngineerNavId = (typeof networkEngineerNavItems)[number]["id"];

export type BreadcrumbItem = {
  label: string;
  href: string;
};

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

export function getActiveSiteNavId(pathname: string): SiteNavId | null {
  const path = normalizePath(pathname);

  if (path === "/") {
    return "home";
  }

  if (path === "/blog" || path.startsWith("/blog/")) {
    return "blog";
  }

  if (path === networkEngineerPath || path.startsWith(`${networkEngineerPath}/`)) {
    return "network-engineer";
  }

  if (path === "/future" || path.startsWith("/future/")) {
    return "future";
  }

  return null;
}

export function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const path = normalizePath(pathname);

  if (path === "/") {
    return [];
  }

  const home = { label: "首頁", href: "/" };

  if (path === "/blog" || path.startsWith("/blog/")) {
    return [home, { label: "Dawn Blog", href: "/blog" }];
  }

  if (path === "/future" || path.startsWith("/future/")) {
    return [home, { label: "以後再開發", href: "/future" }];
  }

  if (path === networkEngineerPath) {
    return [home, { label: "Network Engineer", href: networkEngineerPath }];
  }

  const networkItem = { label: "Network Engineer", href: networkEngineerPath };

  if (path === networkEngineerChatPath) {
    return [home, networkItem, { label: "AI Chat", href: networkEngineerChatPath }];
  }

  if (path === networkPmAutomationPath || path === legacyExcelAutomationPath) {
    return [home, networkItem, { label: "Network PM Automation", href: networkPmAutomationPath }];
  }

  if (path === "/network-engineer/future") {
    return [home, networkItem, { label: "以後再開發", href: "/network-engineer/future" }];
  }

  if (path === "/settings") {
    return [home, { label: "Settings", href: "/settings" }];
  }

  if (path === "/login") {
    return [home, { label: "Login", href: "/login" }];
  }

  return [home];
}

export function getSettingsHref(isAdmin: boolean) {
  return isAdmin ? "/settings?tab=providers" : "/settings?tab=artifacts";
}
