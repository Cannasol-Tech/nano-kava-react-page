export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://mushrooms.cannasoltechnologies.com/sitemap.xml',
    host: 'https://mushrooms.cannasoltechnologies.com',
  };
}
