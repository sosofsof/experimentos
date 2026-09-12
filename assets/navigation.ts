const backLink = document.querySelector<HTMLAnchorElement>('[data-site-back]');

backLink?.addEventListener('click', (event: MouseEvent) => {
  // Preserve native link behavior for a new tab, downloads and modified clicks.
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!document.referrer || window.history.length <= 1) return;

  const previousPage = new URL(document.referrer);
  const homePage = new URL(backLink.href);
  const sitePath = homePage.pathname.slice(0, homePage.pathname.lastIndexOf('/') + 1);
  if (previousPage.origin !== homePage.origin || !previousPage.pathname.startsWith(sitePath)) return;

  event.preventDefault();
  window.history.back();
});
