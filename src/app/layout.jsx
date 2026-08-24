import '@/index.css';

export const metadata = {
  title: 'openGym — self-hosted workout tracker',
  description: 'Plan your week, run guided workouts, track every set and your body weight over time.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'openGym'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" data-accent="lime">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
