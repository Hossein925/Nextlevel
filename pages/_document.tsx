import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="fa" dir="rtl">
      <Head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="description" content="An application to manage and evaluate the skills of hospital staff. It allows uploading skill checklists from Excel, dynamically assesses performance based on the categories defined in the file, and provides AI-driven suggestions for improvement." />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <body className="text-slate-800 dark:text-slate-200">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
