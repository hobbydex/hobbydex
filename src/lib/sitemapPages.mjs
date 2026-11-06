// The URLs the sitemap leaves out by path. Only the error page: part numbers can start with 404 (/rc/parts/carson/404140-01/).
const ERROR_PAGE = /^\/404(\/|\.html)$/;

export const inSitemap = (path) => !ERROR_PAGE.test(path);
